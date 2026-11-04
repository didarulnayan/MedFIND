"""Builds documentation/Team_Setup_Guide.docx - how each group member sets up, runs, tests and commits the project."""
from pathlib import Path

import docx
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "documentation" / "Team_Setup_Guide.docx"
FONT, MONO, NAVY = "Calibri", "Consolas", "1F3864"

doc = docx.Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Inches(8.27), Inches(11.69)  # A4
for side in ("left_margin", "right_margin", "top_margin", "bottom_margin"):
    setattr(sec, side, Inches(0.9))

normal = doc.styles["Normal"]
normal.font.name, normal.font.size = FONT, Pt(11)
normal.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
normal.paragraph_format.space_after = Pt(4)
for name, size in (("Heading 1", 16), ("Heading 2", 13)):
    st = doc.styles[name]
    st.font.name, st.font.size, st.font.bold = FONT, Pt(size), True
    st.font.color.rgb = RGBColor.from_string(NAVY)
    st.paragraph_format.space_before = Pt(14 if size == 16 else 10)
    st.paragraph_format.space_after = Pt(6)
    st.paragraph_format.keep_with_next = True


def shade(el, fill):
    pr = el.get_or_add_tcPr() if el.tag.endswith("}tc") else el.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear"), shd.set(qn("w:color"), "auto"), shd.set(qn("w:fill"), fill)
    pr.append(shd)


def para(text="", bold=False, italic=False, size=None, color=None, align=None):
    p = doc.add_paragraph()
    if text:
        add_runs(p, text, bold=bold, italic=italic, size=size, color=color)
    if align:
        p.alignment = align
    return p


def add_runs(p, text, bold=False, italic=False, size=None, color=None):
    """Supports `inline code` and **bold** markers."""
    import re
    for part in re.split(r"(`[^`]+`|\*\*[^*]+\*\*)", text):
        if not part:
            continue
        code = part.startswith("`")
        strong = part.startswith("**")
        t = part.strip("`") if code else part.strip("*") if strong else part
        r = p.add_run(t)
        r.bold = bold or strong
        r.italic = italic
        if size:
            r.font.size = Pt(size)
        if color:
            r.font.color.rgb = RGBColor.from_string(color)
        if code:
            r.font.name = MONO
            r.font.size = Pt(10)
            r._element.rPr.rFonts.set(qn("w:eastAsia"), MONO)


def h1(t):
    doc.add_heading(t, level=1)


def h2(t):
    doc.add_heading(t, level=2)


def steps(items):
    # explicit numbers so every list restarts at 1
    for i, t in enumerate(items, 1):
        p = doc.add_paragraph()
        f = p.paragraph_format
        f.left_indent, f.first_line_indent = Inches(0.3), Inches(-0.22)
        add_runs(p, f"{i}.  {t}")


def bullets(items):
    for t in items:
        p = doc.add_paragraph(style="List Bullet")
        add_runs(p, t)


def code(text):
    for i, line in enumerate(text.strip("\n").splitlines()):
        p = doc.add_paragraph()
        r = p.add_run(line or " ")
        r.font.name, r.font.size = MONO, Pt(10)
        r._element.rPr.rFonts.set(qn("w:eastAsia"), MONO)
        f = p.paragraph_format
        f.space_after, f.space_before, f.left_indent = Pt(0), Pt(0), Inches(0.15)
        shade(p._p, "F2F4F7")
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def note(text, fill="FFF4E5", label="Important"):
    t = doc.add_table(rows=1, cols=1)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    c = t.rows[0].cells[0]
    shade(c._tc, fill)
    p = c.paragraphs[0]
    add_runs(p, f"**{label}:** {text}")
    p.paragraph_format.space_after = Pt(2)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def table(header, rows, widths):
    t = doc.add_table(rows=1, cols=len(header))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for c, h in zip(t.rows[0].cells, header):
        c.paragraphs[0].add_run(h).bold = True
        c.paragraphs[0].runs[0].font.color.rgb = RGBColor.from_string("FFFFFF")
        shade(c._tc, NAVY)
    for row in rows:
        cells = t.add_row().cells
        for c, v in zip(cells, row):
            add_runs(c.paragraphs[0], v, size=10)
    for row in t.rows:
        for c, w in zip(row.cells, widths):
            c.width = Inches(w)
            c.paragraphs[0].paragraph_format.space_after = Pt(1)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


# ------------------------------------------------------------------ content
title = para("MedFind BD - Team Setup Guide", bold=True, size=24, color=NAVY)
title.paragraph_format.space_after = Pt(2)
para("CSE471 System Analysis and Design - Group 02 - Section 03", size=12, color="555555")
para("How to get the project, connect to the shared database, run your own server, test your APIs in Postman and commit your work.",
     italic=True, color="555555")
para("Repository: https://github.com/didarulnayan/MedFIND", bold=True)

table(["Member", "Student ID", "Port", "Feature 01", "Feature 02"], [
    ["Audrija Chowdhury", "22299421", "9421", "Medicine Catalog Management", "Stock & Expiry Tracking"],
    ["Abdullah Al Zahur Rafi", "22299050", "9050", "Medicine Details & Reservation Request", "Reservation Status Tracking"],
    ["Abdullah Al Muqit", "22201783", "1783", "Medicine Search & Filter", "Nearby Pharmacies & Sorting"],
    ["Md Didarul Islam Nayan", "23301274", "1274", "Pharmacy Verification & Reviews", "Complaints & Disputes"],
], [1.55, 0.85, 0.5, 1.85, 1.75])

h1("1. What you need first")
bullets([
    "**Node.js 20 or newer** - https://nodejs.org (choose the LTS version). Check with `node -v`.",
    "**Git** - https://git-scm.com. Check with `git --version`.",
    "**Postman desktop app** - https://www.postman.com/downloads, with a free account (needed to import collections).",
    "**A GitHub account** added as a collaborator on the repository (ask Didarul).",
    "**The database line (MONGODB_URI)** - Didarul sends it to you privately. It contains the database password.",
])

h1("2. Get the code")
para("Open a terminal (Command Prompt, PowerShell or Git Bash) in the folder where you keep projects, then run:")
code("""
git clone https://github.com/didarulnayan/MedFIND.git
cd MedFIND/backend
npm install
""")
para("`npm install` downloads the libraries into `node_modules` (this takes a minute; the folder is not stored on GitHub).")

h1("3. Create your .env file")
para("The `.env` file holds the database password and the login (JWT) secret. It is **not** on GitHub on purpose, so every member creates their own copy.")
steps([
    "Inside the `backend` folder, copy `.env.example` to a new file named `.env`.",
    "Open `.env` in VS Code or Notepad.",
    "Find the line that starts with `MONGODB_URI=` and replace the whole line with the line Didarul sent you.",
    "Find `JWT_SECRET=` and replace the value with a long random string. You can generate one with the command below.",
    "Save the file.",
])
para("Copy the file:", bold=True)
code("""
Command Prompt:   copy .env.example .env
PowerShell / Git Bash:   cp .env.example .env
""")
para("Generate a JWT secret:", bold=True)
code("""node -e "console.log(require('crypto').randomBytes(48).toString('hex'))\"""")
para("Your MONGODB_URI line will look like this (Didarul's real values replace the placeholders):", bold=True)
code("""
MONGODB_URI=mongodb://<user>:<password>@<host-00>:27017,<host-01>:27017,<host-02>:27017/medfind_bd?tls=true&replicaSet=<replica-set>&authSource=admin&retryWrites=true&w=majority
""")
note("Never commit `.env`, never paste the MONGODB_URI line in a public group chat, and never put it in a screenshot or the assignment document. "
     "`.env` is already listed in `.gitignore`, so `git add` skips it automatically.", fill="FDECEA", label="Keep it private")

h1("4. Allow your computer to reach the database")
para("MongoDB Atlas only accepts connections from IP addresses on its allow list. Right now only Didarul's computer is on it.")
steps([
    "Find your public IP address: open https://whatismyipaddress.com and copy the IPv4 address.",
    "Send it to Didarul.",
    "Didarul adds it in Atlas: **Network Access > Add IP Address > paste it > Confirm** (or chooses **Allow Access from Anywhere** for the whole group).",
    "Wait about a minute until the status shows **Active**.",
])
note("Your IP can change when you switch Wi-Fi (home, university, mobile data). If the database stops connecting on a new network, repeat these steps.", fill="E8F1FB", label="Tip")

h1("5. Run your server")
para("From the `backend` folder, run the command for your member number:")
table(["Member", "Command", "Your server address"], [
    ["1 - Audrija", "`npm run start:member1`", "http://127.0.0.1:9421"],
    ["2 - Rafi", "`npm run start:member2`", "http://127.0.0.1:9050"],
    ["3 - Muqit", "`npm run start:member3`", "http://127.0.0.1:1783"],
    ["4 - Didarul", "`npm run start:member4`", "http://127.0.0.1:1274"],
], [1.3, 2.4, 2.8])
para("When it works, the terminal prints `[db] connected to MongoDB ...` and `listening on http://127.0.0.1:<port>`. "
     "Open `http://127.0.0.1:<your port>/api/health` in a browser: you should see `\"database\": \"connected\"` and your two features.")
para("Stop the server with **Ctrl + C**. For automatic restart while you edit code, use `npm run dev:member1` (2, 3 or 4) instead.")

h2("Resetting the demo data")
code("npm run seed")
note("The database is **shared by the whole group**. `npm run seed` deletes and recreates all data for everyone. "
     "Tell the group before you run it, and never run it while someone else is testing or demonstrating.", label="Warning")

h1("6. Test your APIs in Postman")
steps([
    "Start your server (section 5).",
    "Open Postman, sign in, click **Import** and choose your collection file from the `postman` folder (table below).",
    "Optional: also import your environment file from `postman/environments`.",
    "Postman > **Settings > General > Working directory**: choose the `MedFIND/postman` folder (needed for requests that upload a sample image).",
    "Run `npm run seed` (after telling the group) so the data is in its starting state.",
    "Open your collection, run the **00 Setup** login requests first (if your collection has them), then run each request in order from top to bottom - or use **Run collection**.",
    "Each request has tests; green results mean the API returned the expected status code.",
])
table(["Member", "Collection file"], [
    ["1", "`postman/Member1/Member1_22299421.postman_collection.json`"],
    ["2", "`postman/Member2/Member2_22299050.postman_collection.json`"],
    ["3", "`postman/Member3/Member3_22201783.postman_collection.json`"],
    ["4", "`postman/Member4/Member4_23301274.postman_collection.json`"],
], [0.9, 5.6])
note("The requests depend on each other (for example, \"edit\" uses the id created by \"add\"). If you run them again, run `npm run seed` first.", fill="E8F1FB", label="Tip")

h2("Demo accounts (development only)")
table(["Role", "Email", "Password"], [
    ["Admin", "admin@medfind.test", "Admin@12345"],
    ["Pharmacy owner (Lazz Pharma)", "rahim.owner@medfind.test", "Password@123"],
    ["Pharmacy owner (no pharmacy yet)", "new.owner@medfind.test", "Password@123"],
    ["Patient", "ayesha@medfind.test", "Password@123"],
    ["Patient", "imran@medfind.test", "Password@123"],
], [2.3, 2.6, 1.6])
para("All demo accounts are listed in `documentation/DATABASE_DOCUMENTATION.md`. They are fake and exist only in the seed data.", italic=True, size=10)

h1("7. Know your own code")
para("The course gives zero marks if you cannot explain your code or make a live change during evaluation. Read these files for your features:")
table(["Member", "Files to study (inside backend/src)"], [
    ["1", "routes/catalog.routes.js, routes/stock.routes.js, controllers/catalog.controller.js, controllers/stock.controller.js, services/catalog.service.js, services/stock.service.js, services/inventory.service.js, validators/member1.validators.js"],
    ["2", "routes/reservationRequest.routes.js, routes/reservationStatus.routes.js, the two matching controllers, services/reservationRequest.service.js, services/reservationStatus.service.js, validators/member2.validators.js"],
    ["3", "routes/search.routes.js, routes/nearby.routes.js, the two matching controllers, services/search.service.js, services/nearby.service.js, validators/member3.validators.js"],
    ["4", "routes/verification.routes.js, routes/complaint.routes.js, the two matching controllers, services/verification.service.js, services/complaint.service.js, validators/member4.validators.js"],
], [0.9, 5.6])
para("Shared by everyone: `models/` (database schemas), `middleware/` (login, roles, validation, uploads, errors), `config/` and `app.js`. "
     "Each request goes: **route > controller > service > model**. Practise a small change, such as a new validation message, then restart and test it.")
para("Your submission document is in `submissions/MemberN_Assignment03.docx` and your Postman screenshots are in `screenshots/MemberN/`.")

h1("8. Commit your own work")
para("The course checks that each member has their own commit history. Set your name once, then commit your own changes:")
code("""
git config --global user.name "Your Name"
git config --global user.email "your-github-email@example.com"

git pull                      # get everyone's latest work first
# ... edit your feature files ...
git add .
git commit -m "Member N: describe what you changed"
git push
""")
bullets([
    "Commit only files you worked on; mention your member number in the message.",
    "Always `git pull` before you start and before you push, so you do not overwrite others.",
    "If `git push` is rejected, run `git pull` first, then push again.",
    "Check that `.env` is not in the list when you run `git status` (it should never appear).",
])

h1("9. Troubleshooting")
table(["What you see", "What to do"], [
    ["`querySrv ECONNREFUSED`", "Your MONGODB_URI uses the `mongodb+srv://` format. Ask Didarul for the standard `mongodb://...` line (the one with three hosts)."],
    ["Connection times out / `Server selection timed out`", "Your IP is not on the Atlas allow list (section 4), or your network blocks port 27017."],
    ["`bad auth : authentication failed`", "Wrong username or password in MONGODB_URI. Copy the line again exactly."],
    ["`Missing required environment variable`", "`.env` is missing or not inside the `backend` folder."],
    ["`port ... is already in use`", "Your server is already running in another terminal. Close it or press Ctrl + C there."],
    ["Postman: `401 Unauthorized`", "Run the **00 Setup** login requests first so the token is saved."],
    ["Postman: `404` or `409` on requests that worked before", "The data has changed. Run `npm run seed` (tell the group) and run the collection again from the top."],
    ["Upload request returns `400` (file missing)", "Set Postman's working directory to the `postman` folder, or re-select the image in the Body tab."],
], [2.3, 4.2])

h1("10. Demo-day checklist")
bullets([
    "Laptop charged, Node.js and Postman installed, repository cloned and `npm install` done.",
    "`.env` created and `/api/health` shows `\"database\": \"connected\"` on the university network (check your IP is allowed).",
    "Collection imported; you ran it once successfully.",
    "Group agreed who runs `npm run seed` and when.",
    "You can explain every API of your two features and make a small live change.",
])

doc.save(OUT)
print("wrote", OUT.relative_to(ROOT))
