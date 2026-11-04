# MedFind BD - Team Setup Guide

CSE471 System Analysis and Design - Group 02 - Section 03

How to get the project, connect to the shared database, run your own server, test your APIs in Postman
and commit your work. (The same guide as a Word file: documentation/Team_Setup_Guide.docx)

Repository: https://github.com/didarulnayan/MedFIND

| Member                 | Student ID | Port | Feature 01                             | Feature 02                  |
|------------------------|------------|------|----------------------------------------|-----------------------------|
| Audrija Chowdhury      | 22299421   | 9421 | Medicine Catalog Management            | Stock & Expiry Tracking     |
| Abdullah Al Zahur Rafi | 22299050   | 9050 | Medicine Details & Reservation Request | Reservation Status Tracking |
| Abdullah Al Muqit      | 22201783   | 1783 | Medicine Search & Filter               | Nearby Pharmacies & Sorting |
| Md Didarul Islam Nayan | 23301274   | 1274 | Pharmacy Verification & Reviews        | Complaints & Disputes       |


## 1. What you need first

- Node.js 20 or newer - https://nodejs.org (choose LTS). Check with: `node -v`
- Git - https://git-scm.com. Check with: `git --version`
- Postman desktop app - https://www.postman.com/downloads, with a free account (needed to import collections)
- A GitHub account added as a collaborator on the repository (ask Didarul)
- The database line (MONGODB_URI) - Didarul sends it to you privately. It contains the database password.


## 2. Get the code

Open a terminal (Command Prompt, PowerShell or Git Bash) in the folder where you keep projects:

```
git clone https://github.com/didarulnayan/MedFIND.git
cd MedFIND/backend
npm install
```

`npm install` downloads the libraries into `node_modules` (takes a minute; that folder is not stored on GitHub).


## 3. Create your .env file

The `.env` file holds the database password and the login (JWT) secret. It is NOT on GitHub on purpose,
so every member creates their own copy.

1. Inside the `backend` folder, copy `.env.example` to a new file named `.env`
   - Command Prompt:        `copy .env.example .env`
   - PowerShell / Git Bash: `cp .env.example .env`
2. Open `.env` in VS Code or Notepad.
3. Replace the whole line that starts with `MONGODB_URI=` with the line Didarul sent you.
   It looks like this (real values instead of the placeholders):

   ```
   MONGODB_URI=mongodb://<user>:<password>@<host-00>:27017,<host-01>:27017,<host-02>:27017/medfind_bd?tls=true&replicaSet=<replica-set>&authSource=admin&retryWrites=true&w=majority
   ```

4. Replace the value of `JWT_SECRET=` with a long random string. Generate one with:

   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

5. Save the file.

> KEEP IT PRIVATE: never commit `.env`, never paste the MONGODB_URI line in a public group chat,
> and never put it in a screenshot or the assignment document. `.env` is already in `.gitignore`,
> so `git add` skips it automatically.


## 4. Allow your computer to reach the database

MongoDB Atlas only accepts connections from IP addresses on its allow list.

1. Find your public IP address: open https://whatismyipaddress.com and copy the IPv4 address.
2. Send it to Didarul.
3. Didarul adds it in Atlas: Network Access > Add IP Address > paste it > Confirm
   (or chooses "Allow Access from Anywhere" for the whole group).
4. Wait about a minute until the status shows Active.

> TIP: your IP changes when you switch networks (home, university, mobile data).
> If the database stops connecting on a new network, repeat these steps.


## 5. Run your server

From the `backend` folder:

| Member      | Command                 | Your server address    |
|-------------|-------------------------|------------------------|
| 1 - Audrija | `npm run start:member1` | http://127.0.0.1:9421  |
| 2 - Rafi    | `npm run start:member2` | http://127.0.0.1:9050  |
| 3 - Muqit   | `npm run start:member3` | http://127.0.0.1:1783  |
| 4 - Didarul | `npm run start:member4` | http://127.0.0.1:1274  |

When it works, the terminal prints `[db] connected to MongoDB ...` and `listening on http://127.0.0.1:<port>`.
Open `http://127.0.0.1:<your port>/api/health` in a browser: you should see `"database": "connected"`
and your two features.

Stop the server with Ctrl + C. For automatic restart while editing, use `npm run dev:member1` (2, 3 or 4).

### Resetting the demo data

```
npm run seed
```

> WARNING: the database is SHARED by the whole group. `npm run seed` deletes and recreates all data
> for everyone. Tell the group before you run it, and never run it while someone else is testing or demonstrating.


## 6. Test your APIs in Postman

1. Start your server (section 5).
2. Open Postman, sign in, click Import and choose your collection file (table below).
3. Optional: also import your environment file from `postman/environments`.
4. Postman > Settings > General > Working directory: choose the `MedFIND/postman` folder
   (needed for requests that upload a sample image).
5. Run `npm run seed` (after telling the group) so the data is in its starting state.
6. Run the "00 Setup" login requests first (if your collection has them), then run each request
   in order from top to bottom - or use "Run collection".
7. Each request has tests; green results mean the API returned the expected status code.

| Member | Collection file                                              |
|--------|--------------------------------------------------------------|
| 1      | `postman/Member1/Member1_22299421.postman_collection.json`   |
| 2      | `postman/Member2/Member2_22299050.postman_collection.json`   |
| 3      | `postman/Member3/Member3_22201783.postman_collection.json`   |
| 4      | `postman/Member4/Member4_23301274.postman_collection.json`   |

> TIP: requests depend on each other (for example, "edit" uses the id created by "add").
> To run them again, run `npm run seed` first.

### Demo accounts (development only, fake data)

| Role                             | Email                    | Password     |
|----------------------------------|--------------------------|--------------|
| Admin                            | admin@medfind.test       | Admin@12345  |
| Pharmacy owner (Lazz Pharma)     | rahim.owner@medfind.test | Password@123 |
| Pharmacy owner (no pharmacy yet) | new.owner@medfind.test   | Password@123 |
| Patient                          | ayesha@medfind.test      | Password@123 |
| Patient                          | imran@medfind.test       | Password@123 |

All demo accounts: `documentation/DATABASE_DOCUMENTATION.md`.


## 7. Know your own code

The course gives zero marks if you cannot explain your code or make a live change during evaluation.
Files to study (inside `backend/src`):

- Member 1: routes/catalog.routes.js, routes/stock.routes.js, controllers/catalog.controller.js,
  controllers/stock.controller.js, services/catalog.service.js, services/stock.service.js,
  services/inventory.service.js, validators/member1.validators.js
- Member 2: routes/reservationRequest.routes.js, routes/reservationStatus.routes.js, the two matching
  controllers, services/reservationRequest.service.js, services/reservationStatus.service.js,
  validators/member2.validators.js
- Member 3: routes/search.routes.js, routes/nearby.routes.js, the two matching controllers,
  services/search.service.js, services/nearby.service.js, validators/member3.validators.js
- Member 4: routes/verification.routes.js, routes/complaint.routes.js, the two matching controllers,
  services/verification.service.js, services/complaint.service.js, validators/member4.validators.js

Shared by everyone: `models/` (database schemas), `middleware/` (login, roles, validation, uploads, errors),
`config/` and `app.js`. Each request goes: route > controller > service > model.
Practise a small change (for example a new validation message), then restart and test it.

Your submission document: `submissions/MemberN_Assignment03.docx`. Your Postman screenshots: `screenshots/MemberN/`.


## 8. Commit your own work

The course checks that each member has their own commit history. Set your name once, then commit your own changes:

```
git config --global user.name "Your Name"
git config --global user.email "your-github-email@example.com"

git pull                      # get everyone's latest work first
# ... edit your feature files ...
git add .
git commit -m "Member N: describe what you changed"
git push
```

- Commit only files you worked on; mention your member number in the message.
- Always `git pull` before you start and before you push, so you do not overwrite others.
- If `git push` is rejected, run `git pull` first, then push again.
- Check that `.env` never appears when you run `git status`.


## 9. Troubleshooting

| What you see                                      | What to do |
|---------------------------------------------------|------------|
| `querySrv ECONNREFUSED`                           | Your MONGODB_URI uses the `mongodb+srv://` format. Ask Didarul for the standard `mongodb://...` line (the one with three hosts). |
| Connection times out / `Server selection timed out` | Your IP is not on the Atlas allow list (section 4), or your network blocks port 27017. |
| `bad auth : authentication failed`                | Wrong username or password in MONGODB_URI. Copy the line again exactly. |
| `Missing required environment variable`           | `.env` is missing or not inside the `backend` folder. |
| `port ... is already in use`                      | Your server is already running in another terminal. Close it or press Ctrl + C there. |
| Postman: `401 Unauthorized`                       | Run the "00 Setup" login requests first so the token is saved. |
| Postman: `404` or `409` on requests that worked before | The data changed. Run `npm run seed` (tell the group) and run the collection again from the top. |
| Upload request returns `400` (file missing)       | Set Postman's working directory to the `postman` folder, or re-select the image in the Body tab. |


## 10. Demo-day checklist

- [ ] Laptop charged, Node.js and Postman installed, repository cloned and `npm install` done
- [ ] `.env` created and `/api/health` shows `"database": "connected"` on the university network (your IP is allowed)
- [ ] Collection imported and run once successfully
- [ ] Group agreed who runs `npm run seed` and when
- [ ] You can explain every API of your two features and make a small live change
