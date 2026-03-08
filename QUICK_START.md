# Quick-Start Commands
## Get NexusBoard Running in 3 Steps

---

## Step 1: Whitelist Your IP in MongoDB Atlas
1. Open https://account.mongodb.com/account/login
2. Go to **Network Access** → **IP Whitelist**
3. Click **+ Add IP Address**
4. Enter your current IP or use `0.0.0.0/0` (temporary, change in production)
5. Click **Confirm**
6. Wait 2-3 minutes for it to activate

---

## Step 2: Start Backend
```bash
cd server
npm run dev
```

**Expected output:**
```
[nodemon] 3.1.14
[nodemon] to restart at any time, type `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: js,json
dotenv@17.3.1 injecting env (8) from ..\.env
Server running on port 5001
MongoDB Connected: nexusboardcluster-...
```

 Backend is ready when you see both lines above.

---

## Step 3: Start Frontend (New Terminal)
```bash
cd client
npm run dev
```

**Expected output:**
```
> client@0.0.0 dev
> vite

VITE v4.5.14  ready in 358 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

Frontend is ready. Open http://localhost:5173 in your browser.

---

## Test the App (5 minutes)

### 1. Register & Login
1. Click **Register** on the login page
2. Enter: Name, Email, Password (any password)
3. Create account → Auto-login → Redirected to Dashboard

### 2. Create Workspace
1. Click **New Workspace** button
2. Enter name: "Test Workspace"
3. Enter description: "My first workspace"
4. Click **Create** → Listed on dashboard

### 3. Enter Workspace
1. Click workspace card
2. See modules (Kanban, Chat, Files, Timeline, Notes)
3. See sidebar with workspace name and collapsible switcher

### 4. Test Kanban
1. Click **Kanban Board** module
2. Click **Add Task** in any column (e.g., To Do)
3. Enter task title: "Build feature X"
4. See task appear in column
5. Drag task to another column (e.g., In Progress)
6. Refresh page → Drag position persists

### 5. Test Chat
1. Click **Team Chat** module
2. Type message: "Hello workspace!"
3. Press **Send**
4. See message appear from you
5. See typing indicator (if you start typing)

### 6. Test Files
1. Click **File Storage** module
2. Click **Upload** button
3. Select any file (image, PDF, etc.)
4. See file uploaded with uploader name and file size
5. Click download icon → Opens in new tab (Cloudinary URL)

### 7. View Activity
1. Click **Activity Timeline** module
2. See all events: workspace create, task create, message send, file upload
3. Shows who did what and when

---

## Stop Servers

### Terminal 1 (Backend):
Press `Ctrl+C` to kill `npm run dev`

### Terminal 2 (Frontend):
Press `Ctrl+C` or press `q` in Vite prompt

---

## Troubleshooting

**Backend won't start?**
```
Error: Could not connect to any servers in your MongoDB Atlas cluster.
```
→ Go to https://account.mongodb.com → Network Access → Add your IP

**Frontend shows blank page?**
→ Open browser DevTools (F12) → Check Console for errors
→ If API errors, ensure backend is running (`Server running on port 5001`)

**Tasks not persisting on refresh?**
→ Backend must be connected to MongoDB → Check backend logs

**Socket.io not connecting?**
→ Check browser DevTools → Network tab for `WebSocket` connection to `localhost:5001`
→ Backend must be running

---

## Environment Variables

All pre-configured in `.env`:
```
NODE_ENV=development
PORT=5001
MONGO_URI=mongodb+srv://mohan0403s_db_user:XMHFgT3NeWWGb3gQ@nexusboardcluster.kceypko.mongodb.net/?appName=NexusBoardCluster
JWT_SECRET=your_super_secret_key_change_this
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name  (optional, update for file uploads)
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Change `CLIENT_URL` if frontend runs on different port (e.g., 5174/5175).

---

## What's Built?

 **10 Complete Flows**
1. JWT Authentication (register/login)
2. Multi-workspace system (create/invite/manage)
3. Dynamic modules (Kanban/Chat/Files/Timeline/Notes)
4. Kanban board (columns/drag-drop/realtime)
5. Real-time chat (messages/typing/read receipts)
6. File storage (upload/delete/Cloudinary)
7. Activity timeline (event logging)
8. Member management (roles/invite/remove)
9. Socket.io realtime (workspace broadcasts)
10. Dark-theme SaaS UI (responsive/mobile-ready)

 **Tech Stack**
- Backend: Node.js, Express, MongoDB, Socket.io, JWT, bcrypt, Cloudinary
- Frontend: React, Vite, Redux, Tailwind CSS, Socket.io-client
- UI: Responsive, dark theme, drag-drop, animations

 **Security**
- JWT tokens with bcrypt hashing
- Role-based access (owner/admin/member/viewer)
- Workspace isolation + membership checks
- CORS configured

---

## Next Steps (After Testing)

1. **Customize branding** → Update UI colors, logo, company name
2. **Add more features** → Additional modules, user profiles, notifications
3. **Deploy to production** → Set up domain, HTTPS, database backups
4. **Invite team members** → Workspace invites (built-in)

---

**You're all set! Enjoy NexusBoard!**
