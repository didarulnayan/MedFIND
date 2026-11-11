import { Route, Routes } from 'react-router-dom';
import { PanelLayout, PublicLayout, RequireRole } from './components/layouts';
import { EmptyState, LinkButton } from './components/ui';
import { Login, Register } from './pages/common/Auth';
import OwnerDashboard from './pages/common/OwnerDashboard';
// Member 1 - Audrija Chowdhury: Medicine Catalog Management, Stock & Expiry Tracking
import CatalogList from './pages/member1/CatalogList';
import AddMedicine from './pages/member1/AddMedicine';
import EditMedicine from './pages/member1/EditMedicine';
import StockOverview from './pages/member1/StockOverview';
import AddBatch from './pages/member1/AddBatch';
import MedicineBatches from './pages/member1/MedicineBatches';
import ExpiryInventory from './pages/member1/ExpiryInventory';
// Member 2 - Abdullah Al Zahur Rafi: Medicine Details & Reservation Request, Reservation Status Tracking
import MedicineDetails from './pages/member2/MedicineDetails';
import ReservationForm from './pages/member2/ReservationForm';
import RequestSubmitted from './pages/member2/RequestSubmitted';
import MyReservations from './pages/member2/MyReservations';
import ReservationTimeline from './pages/member2/ReservationTimeline';
import OwnerInbox from './pages/member2/OwnerInbox';
import OwnerReservationDetail from './pages/member2/OwnerReservationDetail';
// Member 3 - Abdullah Al Muqit: Medicine Search & Filter, Nearby Pharmacies & Sorting
import Home from './pages/member3/Home';
import SearchResults from './pages/member3/SearchResults';
import Nearby from './pages/member3/Nearby';
// Member 4 - Md Didarul Islam Nayan: Pharmacy Verification & Reviews, Complaints & Disputes
import PharmacyProfile from './pages/member4/PharmacyProfile';
import WriteReview from './pages/member4/WriteReview';
import OwnerPharmacy from './pages/member4/OwnerPharmacy';
import AdminPharmacies from './pages/member4/AdminPharmacies';
import AdminVerifyPharmacy from './pages/member4/AdminVerifyPharmacy';
import FileComplaint from './pages/member4/FileComplaint';
import MyComplaints, { ComplaintDetail } from './pages/member4/MyComplaints';
import OwnerComplaints from './pages/member4/OwnerComplaints';
import AdminComplaints, { AdminComplaintReview } from './pages/member4/AdminComplaints';

const patient = (el) => <RequireRole roles={['patient']}>{el}</RequireRole>;

function NotFound() {
  return <EmptyState icon="🧭" title="Page not found" actions={<LinkButton to="/">Go home</LinkButton>}>The page you opened does not exist.</EmptyState>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* patients and visitors */}
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="medicines" element={<SearchResults />} />
        <Route path="medicines/:id" element={<MedicineDetails />} />
        <Route path="medicines/:id/reserve/:pharmacyId" element={patient(<ReservationForm />)} />
        <Route path="nearby" element={<Nearby />} />
        <Route path="pharmacies/:id" element={<PharmacyProfile />} />
        <Route path="pharmacies/:id/review" element={patient(<WriteReview />)} />
        <Route path="reservations" element={patient(<MyReservations />)} />
        <Route path="reservations/:id" element={patient(<ReservationTimeline />)} />
        <Route path="reservations/:id/submitted" element={patient(<RequestSubmitted />)} />
        <Route path="complaints" element={patient(<MyComplaints />)} />
        <Route path="complaints/new" element={patient(<FileComplaint />)} />
        <Route path="complaints/:id" element={patient(<ComplaintDetail />)} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* pharmacy owners */}
      <Route path="owner" element={<RequireRole roles={['owner']}><PanelLayout role="owner" /></RequireRole>}>
        <Route index element={<OwnerDashboard />} />
        <Route path="pharmacy" element={<OwnerPharmacy />} />
        <Route path="catalog" element={<CatalogList />} />
        <Route path="catalog/add" element={<AddMedicine />} />
        <Route path="catalog/:id/edit" element={<EditMedicine />} />
        <Route path="stock" element={<StockOverview />} />
        <Route path="stock/add-batch" element={<AddBatch />} />
        <Route path="stock/expiry" element={<ExpiryInventory />} />
        <Route path="stock/:itemId/batches" element={<MedicineBatches />} />
        <Route path="reservations" element={<OwnerInbox />} />
        <Route path="reservations/:id" element={<OwnerReservationDetail />} />
        <Route path="complaints" element={<OwnerComplaints />} />
      </Route>

      {/* admins */}
      <Route path="admin" element={<RequireRole roles={['admin']}><PanelLayout role="admin" /></RequireRole>}>
        <Route index element={<AdminPharmacies />} />
        <Route path="pharmacies" element={<AdminPharmacies />} />
        <Route path="pharmacies/:id" element={<AdminVerifyPharmacy />} />
        <Route path="complaints" element={<AdminComplaints />} />
        <Route path="complaints/:id" element={<AdminComplaintReview />} />
      </Route>
    </Routes>
  );
}
