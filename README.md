# Supplier Compliance Tracker

A modern, responsive web application for managing supplier compliance tracking, built with React and Firebase.

![Supplier Tracker](https://img.shields.io/badge/React-18.x-blue) ![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange) ![Tailwind](https://img.shields.io/badge/Tailwind-CSS-cyan)

## 📋 Overview

Supplier Compliance Tracker is a comprehensive platform designed to manage and monitor supplier compliance documentation for businesses handling 30,000+ suppliers. The application tracks insurance liability, GST numbers, WCB clearance letters, and automates compliance recheck notifications.

## ✨ Features

### Dashboard
- **Progress Overview**: Visual progress bar showing completion percentage
- **Statistics Cards**: Quick view of new suppliers, existing suppliers, InQFlow setup status, priority items, and recheck alerts
- **Alert Panels**: 
  - Expired Compliance (>1 year since last check)
  - Due Soon (11-12 months since last check)
  - Priority Items (flagged suppliers needing attention)
- **Quick Actions**: Fast access to common operations

### Supplier Management
- **Add Suppliers**: Single entry or bulk import via CSV
- **Edit Suppliers**: Inline editing with auto-save
- **Delete Suppliers**: With confirmation prompt
- **Priority Flagging**: Star icon to mark urgent items
- **Notes System**: Add timestamped notes with username tracking

### Compliance Tracking
- **Required Documents**: Insurance Liability, GST Number, WCB Clearance
- **Auto-Complete**: If Labour Involved = No, supplier is automatically marked complete
- **Last Compliance Check**: Automatically recorded when supplier is completed and setup in InQFlow
- **Expiry Alerts**: Visual indicators for suppliers needing compliance recheck

### Data Management
- **Auto-Save**: Changes saved to Firebase with 3-second debounce (prevents quota issues)
- **Offline Support**: Local storage fallback when Firebase is unavailable
- **CSV Export**: Full backup download anytime
- **CSV Import**: Restore from backup or import new supplier lists
- **Daily Reports**: Automated email reports at 5 PM (when app is open)

### Search & Filter
- **Real-time Search**: Search by name, contact, insurance, GST, WCB
- **Multiple Filters**: Status, Type, New/Existing, Priority, Compliance
- **Sorting**: By name, status, type, new/existing, priority, recheck status
- **Pagination**: 50 suppliers per page for optimal performance

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Firebase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/supplier-tracker.git
   cd supplier-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   
   Create `src/firebase.js`:
   ```javascript
   import { initializeApp } from 'firebase/app';
   import { getFirestore } from 'firebase/firestore';

   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };

   const app = initializeApp(firebaseConfig);
   export const db = getFirestore(app);
   ```

4. **Configure EmailJS** (for daily reports)
   
   Update the EmailJS initialization in `App.jsx`:
   ```javascript
   emailjs.init('YOUR_EMAILJS_PUBLIC_KEY');
   ```
   
   Update the service and template IDs in the `performBackup` function.

5. **Start the development server**
   ```bash
   npm start
   ```

## 📖 User Guide

### Login
- **Username**: Enter your name
- **Password**: `apvan2025`

### Adding Suppliers

#### Single Entry
1. Click "Add Supplier" button
2. Fill in supplier details
3. Click "Save"

#### Bulk Import
1. Click "Template" to download CSV template
2. Fill in the template with your data
3. Click "Import List" and select your CSV file

### CSV Template Columns
| Column | Description | Values |
|--------|-------------|--------|
| Supplier Name | Company or individual name | Text |
| Contact Info | Email or phone | Text |
| Supplier Type | Type of supplier | Company / Individual |
| New/Existing | Is this a new supplier? | Yes / No |
| Labour Involved | Does work involve labour? | Yes / No |
| Setup in InQFlow | Setup in InQFlow system? | Yes / No |
| Insurance Liability | Insurance document reference | Text |
| GST Number | GST registration number | Text |
| WCB Clearance | WCB clearance reference | Text |
| Priority | Flag as priority? | Yes / No |

### Compliance Recheck System

The system automatically tracks compliance expiry for completed suppliers:

- **🔴 Expired (Red)**: Last compliance check was over 1 year ago - immediate recheck required
- **🟡 Due Soon (Yellow)**: Last compliance check was 11-12 months ago - plan recheck soon
- **✅ OK (Green)**: Compliance is current

*Note: This only applies to suppliers marked as "Complete" with "Setup in InQFlow = Yes"*

### Priority System
- Click the ⭐ star icon to flag a supplier as priority
- Priority suppliers appear in the dashboard alert panel
- Use the "Priority" filter to show only flagged items

### Notes
- Click the 💬 notes icon on any supplier
- Add timestamped notes with your username
- View history of all previous notes

### Daily Reports
- **Automatic**: Sent at 5 PM daily (app must be open)
- **Manual**: Click "Send Report" button anytime
- Reports include progress stats, priority count, expired/due soon lists
- CSV backup attached to email

## 🔧 Technical Details

### Tech Stack
- **Frontend**: React 18
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Firebase Firestore
- **Email**: EmailJS

### Firebase Structure
```
suppliers/
  └── main/
      ├── suppliers: []
      ├── lastBackup: string
      └── lastSaved: string
```

### Performance Optimizations
- Debounced search (300ms delay)
- Debounced Firebase saves (3 second delay)
- Pagination (50 items per page)
- Local storage caching

## 🔒 Security Notes

- Change the default password in production
- Configure Firebase security rules
- Use environment variables for sensitive keys

## 📝 License

MIT License

Copyright (c) 2025 Zeyong Jin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## 🆘 Troubleshooting

### Sync Failed
- Check internet connection
- Click "Retry Sync" button
- Check Firebase quota limits

### Import Failed
- Verify CSV format matches template
- Check for special characters in data
- Ensure file encoding is UTF-8

### Email Not Received
- Check spam folder
- Verify EmailJS configuration
- Check EmailJS quota limits

### Slow Performance
- Use search/filters to reduce displayed items
- Export and restore to clean old data
- Check browser console for errors

---

**Questions or Issues?** Contact the development team or submit an issue on GitHub.
