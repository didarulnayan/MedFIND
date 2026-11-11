// Member 1 - Feature 2: Batches of one medicine in earliest-expiry order (F2-03)
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { dateOnly } from '../../lib/format';
import OwnerGate from '../../components/OwnerGate';
import { Button, ErrorBox, Field, Input, LinkButton, Loading, Modal, Notice, PageHeader, StatCard, StatusBadge, Table } from '../../components/ui';

const toInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export default function MedicineBatches() {
  const { itemId } = useParams();
  const { data, error, loading, reload } = useApi(`/owner/stock/items/${itemId}/batches`);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  async function saveEdit(e) {
    e.preventDefault();
    setBusy(true);
    setActionError(null);
    const body = { quantity: Number(editing.quantity) };
    if (editing.source !== 'adjustment') {
      body.batchNumber = editing.batchNumber;
      if (editing.expiryDate) body.expiryDate = editing.expiryDate;
      if (editing.manufacturingDate) body.manufacturingDate = editing.manufacturingDate;
    }
    try {
      await api(`/owner/stock/batches/${editing.id}`, { method: 'PATCH', body });
      setEditing(null);
      reload();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  async function confirmRemove() {
    setBusy(true);
    setActionError(null);
    try {
      await api(`/owner/stock/batches/${removing.id}`, { method: 'DELETE' });
      setRemoving(null);
      reload();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <OwnerGate error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  const m = data.medicine;
  const next = data.nextBatchToUse;

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Stock & Expiry', to: '/owner/stock' }, { label: `${m.brandName} ${m.strength}` }, { label: 'Batches' }]}
        title={`${m.brandName} ${m.strength}: batches`}
        subtitle="Batches are used in earliest-expiry order."
        actions={<LinkButton to={`/owner/stock/add-batch?item=${itemId}`}>+ Add batch</LinkButton>}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Available stock (non-expired)" value={data.availableStock} tone="teal" />
        <StatCard label="Expired (not counted)" value={data.expiredUnits} tone="red" />
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-sm text-slate-500">Next batch to use</p>
          <p className="mt-1 text-2xl font-extrabold">{next ? next.batchNumber : '-'}</p>
          {next && <p className="text-xs text-slate-500">{next.expiryDate ? `exp ${dateOnly(next.expiryDate)}` : 'no expiry date'}</p>}
        </div>
      </div>
      <Table head={['Batch no.', 'Quantity', 'Expiry date', 'Time left', 'Status', 'Actions']}>
        {/* usable batches in the order they will be used, expired/depleted ones last */}
        {[...data.batches].sort((a, b) => Number(['Expired', 'Depleted'].includes(a.status)) - Number(['Expired', 'Depleted'].includes(b.status))).map((b) => (
          <tr key={b.id} className={b.status === 'Expired' ? 'bg-red-50/40' : 'hover:bg-slate-50/60'}>
            <td className="px-5 py-3.5 font-semibold">{b.batchNumber}{b.source === 'adjustment' && <span className="ml-2 text-xs font-normal text-slate-500">(stock adjustment)</span>}</td>
            <td className="px-5 py-3.5">{b.quantity}</td>
            <td className="px-5 py-3.5">{dateOnly(b.expiryDate)}</td>
            <td className="px-5 py-3.5">{b.timeLeft}</td>
            <td className="px-5 py-3.5"><StatusBadge status={b.status} /></td>
            <td className="px-5 py-3.5">
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => { setActionError(null); setEditing({ ...b, expiryDate: toInput(b.expiryDate), manufacturingDate: toInput(b.manufacturingDate) }); }}>Edit</Button>
                <Button size="sm" variant="danger" onClick={() => { setActionError(null); setRemoving(b); }}>Remove</Button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
      {next && (
        <Notice tone="teal" className="mt-5">
          Use first: <b>{next.batchNumber}</b> (earliest expiring non-expired batch). Expired batches are excluded from available stock.
        </Notice>
      )}
      <div className="mt-5"><LinkButton to="/owner/stock" variant="secondary">Back</LinkButton></div>

      <Modal open={Boolean(editing)} title={editing ? `Edit batch ${editing.batchNumber}` : ''} onClose={() => setEditing(null)}
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button form="edit-batch" type="submit" loading={busy}>Save</Button></>}>
        {editing && (
          <form id="edit-batch" onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-2">
            {editing.source !== 'adjustment' && (
              <Field label="Batch number" required><Input required value={editing.batchNumber} onChange={(e) => setEditing({ ...editing, batchNumber: e.target.value })} /></Field>
            )}
            <Field label="Quantity" required><Input type="number" min="0" required value={editing.quantity} onChange={(e) => setEditing({ ...editing, quantity: e.target.value })} suffix="units" /></Field>
            {editing.source !== 'adjustment' && (
              <>
                <Field label="Manufacturing date"><Input type="date" value={editing.manufacturingDate} onChange={(e) => setEditing({ ...editing, manufacturingDate: e.target.value })} /></Field>
                <Field label="Expiry date"><Input type="date" value={editing.expiryDate} onChange={(e) => setEditing({ ...editing, expiryDate: e.target.value })} /></Field>
              </>
            )}
            <ErrorBox error={actionError} className="sm:col-span-2" />
          </form>
        )}
      </Modal>

      <Modal open={Boolean(removing)} title="Remove batch?" onClose={() => setRemoving(null)}
        footer={<><Button variant="secondary" onClick={() => setRemoving(null)}>Cancel</Button><Button variant="dangerSolid" loading={busy} onClick={confirmRemove}>Remove batch</Button></>}>
        {removing && <p className="text-sm text-slate-600">Batch <b>{removing.batchNumber}</b> ({removing.quantity} units) will be deleted and available stock recalculated.</p>}
        <ErrorBox error={actionError} className="mt-4" />
      </Modal>
    </>
  );
}
