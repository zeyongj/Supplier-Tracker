import React, { useState, useEffect } from 'react';
import { Download, Upload, LogOut, Plus, Trash2, Check, X, Clock, TrendingUp, MessageSquare, Filter, ArrowUpDown, AlertCircle, Building, User, Briefcase, Search, Star, HelpCircle, RefreshCw, Bell } from 'lucide-react';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import emailjs from '@emailjs/browser';

// Initialize EmailJS - REPLACE WITH YOUR KEY
emailjs.init('0jFdO4TX9CMMKcLfe');

const SupplierTracker = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginName, setLoginName] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [suppliers, setSuppliers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [showUpload, setShowUpload] = useState(false);
  const [showImportList, setShowImportList] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNoteSupplier, setCurrentNoteSupplier] = useState(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSupplierType, setFilterSupplierType] = useState('all');
  const [filterNewSupplier, setFilterNewSupplier] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [useLocalStorage, setUseLocalStorage] = useState(false);
  const [syncStatus, setSyncStatus] = useState('synced');

  const LOCAL_STORAGE_KEY = 'supplier-tracker-local-data';

  // Load data from Firebase or localStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        const docRef = doc(db, 'suppliers', 'main');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSuppliers(data.suppliers || []);
          setLastBackup(data.lastBackup);
          setUseLocalStorage(false);
          setSyncStatus('synced');
          console.log('✅ Data loaded from Firebase');
        } else {
          const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (localData) {
            const parsed = JSON.parse(localData);
            setSuppliers(parsed.suppliers || []);
            setLastBackup(parsed.lastBackup);
            setUseLocalStorage(true);
            setSyncStatus('local');
            console.log('📦 Data loaded from local storage');
          }
        }
      } catch (error) {
        console.error('Firebase error, using local storage:', error);
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) {
          const parsed = JSON.parse(localData);
          setSuppliers(parsed.suppliers || []);
          setLastBackup(parsed.lastBackup);
          setUseLocalStorage(true);
          setSyncStatus('offline');
        }
      }
    };
    loadData();
  }, []);

  // Auto-save to both Firebase and localStorage
  useEffect(() => {
    if (suppliers.length > 0 || isLoggedIn) {
      saveData();
    }
  }, [suppliers]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkBackup = () => {
      const now = new Date();
      if (now.getHours() === 17 && now.getMinutes() === 0 && lastBackup !== now.toDateString()) {
        performBackup();
      }
    };
    const interval = setInterval(checkBackup, 60000);
    return () => clearInterval(interval);
  }, [suppliers, lastBackup]);

  const saveData = async () => {
    const data = {
      suppliers,
      lastBackup,
      lastSaved: new Date().toISOString()
    };

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('localStorage full:', e);
    }

    try {
      await setDoc(doc(db, 'suppliers', 'main'), data);
      setSyncStatus('synced');
      setUseLocalStorage(false);
      console.log('✅ Synced to Firebase');
    } catch (error) {
      console.error('Firebase sync failed:', error);
      setSyncStatus('offline');
      setUseLocalStorage(true);
    }
  };

  const retrySyncToFirebase = async () => {
    setSyncStatus('syncing');
    try {
      const data = {
        suppliers,
        lastBackup,
        lastSaved: new Date().toISOString()
      };
      await setDoc(doc(db, 'suppliers', 'main'), data);
      setSyncStatus('synced');
      setUseLocalStorage(false);
      alert('✅ Successfully synced to Firebase!');
    } catch (error) {
      setSyncStatus('offline');
      alert('❌ Sync failed. Check your connection and try again.');
    }
  };

  const handleLogin = () => {
    if (loginPwd === 'apvan2025' && loginName.trim()) {
      setIsLoggedIn(true);
      setCurrentUser(loginName.trim());
      setLoginPwd('');
    } else {
      alert('Invalid credentials. Password is: apvan2025');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser('');
    setLoginName('');
    setEditingId(null);
  };

  const addSupplier = () => {
    const newSupplier = {
      id: Date.now(),
      supplierName: '',
      contactInfo: '',
      supplierType: 'Company',
      isNewSupplier: 'Yes',
      labourInvolved: 'Yes',
      setupInQflow: 'No',
      insuranceLiability: '',
      gstNumber: '',
      wcbClearance: '',
      lastComplianceCheck: null,
      priority: false,
      notes: [],
      lastModifiedTime: new Date().toISOString(),
      lastModifiedUser: currentUser,
      completed: false
    };
    setSuppliers([...suppliers, newSupplier]);
    setEditingId(newSupplier.id);
    setEditingData(newSupplier);
    setCurrentPage(1);
  };

  const deleteSupplier = (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      setSuppliers(suppliers.filter(s => s.id !== id));
    }
  };

  const startEdit = (supplier) => {
    setEditingId(supplier.id);
    setEditingData({ ...supplier });
  };

  const saveEdit = () => {
    const completed = editingData.labourInvolved === 'No' || !!(
      editingData.insuranceLiability?.trim() &&
      editingData.gstNumber?.trim() &&
      editingData.wcbClearance?.trim()
    );

    const updatedSupplier = {
      ...editingData,
      lastModifiedTime: new Date().toISOString(),
      lastModifiedUser: currentUser,
      completed,
      lastComplianceCheck: completed && editingData.setupInQflow === 'Yes' && !editingData.lastComplianceCheck
        ? new Date().toISOString()
        : editingData.lastComplianceCheck
    };

    setSuppliers(suppliers.map(s => s.id === editingId ? updatedSupplier : s));
    setEditingId(null);
    setEditingData({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingData({});
  };

  const togglePriority = (id) => {
    setSuppliers(suppliers.map(s => 
      s.id === id ? { ...s, priority: !s.priority, lastModifiedUser: currentUser, lastModifiedTime: new Date().toISOString() } : s
    ));
  };

  const openNoteModal = (supplier) => {
    setCurrentNoteSupplier(supplier);
    setNewNoteText('');
    setShowNoteModal(true);
  };

  const addNote = () => {
    if (!newNoteText.trim()) {
      alert('Please enter a note');
      return;
    }

    const note = {
      id: Date.now(),
      text: newNoteText.trim(),
      user: currentUser,
      timestamp: new Date().toISOString()
    };

    setSuppliers(suppliers.map(s => 
      s.id === currentNoteSupplier.id 
        ? { ...s, notes: [...(s.notes || []), note], lastModifiedTime: new Date().toISOString(), lastModifiedUser: currentUser }
        : s
    ));
    
    setShowNoteModal(false);
    setNewNoteText('');
    setCurrentNoteSupplier(null);
  };

  const exportCSV = () => {
    const headers = ['Supplier Name','Contact Info','Supplier Type','New/Existing','Labour Involved','Setup in InQFlow','Insurance Liability','GST Number','WCB Clearance Letter','Last Compliance Check','Priority','Notes','Last Modified Time','Last Modified User','Completed'];
    
    const rows = suppliers.map(s => [
      s.supplierName, s.contactInfo, s.supplierType, s.isNewSupplier, s.labourInvolved, s.setupInQflow,
      s.insuranceLiability, s.gstNumber, s.wcbClearance,
      s.lastComplianceCheck ? new Date(s.lastComplianceCheck).toLocaleDateString() : '',
      s.priority ? 'Yes' : 'No',
      (s.notes || []).map(n => `[${new Date(n.timestamp).toLocaleString()}] ${n.user}: ${n.text}`).join(' | '),
      new Date(s.lastModifiedTime).toLocaleString(), s.lastModifiedUser, s.completed ? 'Yes' : 'No'
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier_backup_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const downloadTemplate = () => {
    const template = `Supplier Name,Contact Info\nExample Company 1,contact@example1.com\nExample Company 2,555-1234\nExample Company 3,info@example3.com`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supplier_import_template.csv';
    a.click();
  };

  const performBackup = async () => {
    try {
      const expiredSuppliers = getExpiredSuppliers();
      const dueSoonSuppliers = getDueSoonSuppliers();
      const completedCount = suppliers.filter(s => s.completed).length;
      const progressPercent = suppliers.length > 0 ? (completedCount / suppliers.length) * 100 : 0;

      const templateParams = {
        report_date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        report_time: new Date().toLocaleTimeString('en-US'),
        total_suppliers: suppliers.length,
        completed_suppliers: completedCount,
        progress_percentage: progressPercent.toFixed(1),
        new_suppliers: suppliers.filter(s => s.isNewSupplier === 'Yes').length,
        existing_suppliers: suppliers.filter(s => s.isNewSupplier === 'No').length,
        setup_in_qflow: suppliers.filter(s => s.setupInQflow === 'Yes').length,
        pending_setup: suppliers.filter(s => s.setupInQflow === 'No').length,
        expired_count: expiredSuppliers.length,
        due_soon_count: dueSoonSuppliers.length,
        priority_count: suppliers.filter(s => s.priority).length,
        expired_list: expiredSuppliers.length > 0 ? expiredSuppliers.map(s => `  • ${s.supplierName} - Last: ${new Date(s.lastComplianceCheck).toLocaleDateString()}`).join('\n') : 'None',
        due_soon_list: dueSoonSuppliers.length > 0 ? dueSoonSuppliers.map(s => `  • ${s.supplierName} - Last: ${new Date(s.lastComplianceCheck).toLocaleDateString()}`).join('\n') : 'None'
      };

      await emailjs.send('service_r7ntn59', 'template_t3yjp08', templateParams);
      exportCSV();
      setLastBackup(new Date().toDateString());
      alert('✅ Daily report sent!');
    } catch (error) {
      console.error('Email failed:', error);
      alert('⚠️ Email failed: ' + (error.text || error.message));
    }
  };

  const importCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const imported = lines.slice(1).map((line, i) => {
          const vals = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"').trim()) || [];
          return {
            id: Date.now() + i,
            supplierName: vals[0] || '', contactInfo: vals[1] || '', supplierType: vals[2] || 'Company',
            isNewSupplier: vals[3] || 'Yes', labourInvolved: vals[4] || 'Yes', setupInQflow: vals[5] || 'No',
            insuranceLiability: vals[6] || '', gstNumber: vals[7] || '', wcbClearance: vals[8] || '',
            lastComplianceCheck: vals[9] || null, priority: vals[10] === 'Yes',
            notes: [], lastModifiedTime: new Date().toISOString(), lastModifiedUser: currentUser,
            completed: vals[14] === 'Yes'
          };
        });
        setSuppliers(imported);
        setShowUpload(false);
        alert(`✅ Restored ${imported.length} suppliers!`);
      } catch (error) {
        alert('Error importing. Check format.');
      }
    };
    reader.readAsText(file);
  };

  const importSupplierList = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const newSuppliers = lines.slice(1).map((line, i) => {
          const vals = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
          return {
            id: Date.now() + i + Math.random(),
            supplierName: vals[0] || '', contactInfo: vals[1] || '', supplierType: 'Company',
            isNewSupplier: 'Yes', labourInvolved: 'Yes', setupInQflow: 'No',
            insuranceLiability: '', gstNumber: '', wcbClearance: '', lastComplianceCheck: null,
            priority: false, notes: [], lastModifiedTime: new Date().toISOString(),
            lastModifiedUser: currentUser, completed: false
          };
        });
        setSuppliers([...suppliers, ...newSuppliers]);
        setShowImportList(false);
        alert(`✅ Imported ${newSuppliers.length} suppliers!`);
      } catch (error) {
        alert('Error importing list.');
      }
    };
    reader.readAsText(file);
  };

  const getExpiredSuppliers = () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return suppliers.filter(s => s.setupInQflow === 'Yes' && s.lastComplianceCheck && new Date(s.lastComplianceCheck) < oneYearAgo && s.completed);
  };

  const getDueSoonSuppliers = () => {
    const oneYear = new Date();
    oneYear.setFullYear(oneYear.getFullYear() - 1);
    const elevenMonths = new Date();
    elevenMonths.setMonth(elevenMonths.getMonth() - 11);
    return suppliers.filter(s => {
      if (!s.setupInQflow || s.setupInQflow !== 'Yes' || !s.lastComplianceCheck || !s.completed) return false;
      const check = new Date(s.lastComplianceCheck);
      return check >= oneYear && check < elevenMonths;
    });
  };

  const getPrioritySuppliers = () => suppliers.filter(s => s.priority);

  const getFilteredAndSortedSuppliers = () => {
    let filtered = [...suppliers];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        (s.supplierName || '').toLowerCase().includes(query) ||
        (s.contactInfo || '').toLowerCase().includes(query) ||
        (s.insuranceLiability || '').toLowerCase().includes(query) ||
        (s.gstNumber || '').toLowerCase().includes(query) ||
        (s.wcbClearance || '').toLowerCase().includes(query)
      );
    }

    if (filterStatus !== 'all') filtered = filtered.filter(s => filterStatus === 'completed' ? s.completed : !s.completed);
    if (filterSupplierType !== 'all') filtered = filtered.filter(s => s.supplierType === filterSupplierType);
    if (filterNewSupplier !== 'all') filtered = filtered.filter(s => s.isNewSupplier === filterNewSupplier);
    if (filterPriority !== 'all') filtered = filtered.filter(s => filterPriority === 'priority' ? s.priority : !s.priority);

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = (a.supplierName || '').localeCompare(b.supplierName || '');
      else if (sortBy === 'status') cmp = (a.completed === b.completed) ? 0 : a.completed ? -1 : 1;
      else if (sortBy === 'type') cmp = (a.supplierType || '').localeCompare(b.supplierType || '');
      else if (sortBy === 'new') cmp = (a.isNewSupplier || '').localeCompare(b.isNewSupplier || '');
      else if (sortBy === 'priority') cmp = (a.priority === b.priority) ? 0 : a.priority ? -1 : 1;
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return filtered;
  };

  const completedCount = suppliers.filter(s => s.completed).length;
  const progressPercent = suppliers.length > 0 ? (completedCount / suppliers.length) * 100 : 0;
  const newSuppliers = suppliers.filter(s => s.isNewSupplier === 'Yes');
  const oldSuppliers = suppliers.filter(s => s.isNewSupplier === 'No');
  const notSetupCount = suppliers.filter(s => s.setupInQflow === 'No').length;
  const setupCount = suppliers.filter(s => s.setupInQflow === 'Yes').length;
  const expiredSuppliers = getExpiredSuppliers();
  const dueSoonSuppliers = getDueSoonSuppliers();
  const prioritySuppliers = getPrioritySuppliers();
  const filteredSuppliers = getFilteredAndSortedSuppliers();

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentSuppliers = filteredSuppliers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-indigo-100 rounded-full mb-4">
              <Check className="w-12 h-12 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Supplier Tracker</h1>
            <p className="text-gray-600">Compliance Management System</p>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input type="text" value={loginName} onChange={(e) => setLoginName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Enter your name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input type="password" value={loginPwd} onChange={(e) => setLoginPwd(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Enter password" />
            </div>
            <button onClick={handleLogin}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg">
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-[1900px] mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Check className="w-8 h-8 text-indigo-600" />
                Supplier Compliance Tracker
              </h1>
              <p className="text-gray-600 mt-1">Welcome, {currentUser}</p>
            </div>
            <div className="flex items-center gap-4">
              {syncStatus !== 'synced' && (
                <button onClick={retrySyncToFirebase} className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200">
                  <RefreshCw className="w-4 h-4" />
                  {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'offline' ? 'Retry Sync' : 'Local Mode'}
                </button>
              )}
              <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                <HelpCircle className="w-4 h-4" />
                Help
              </button>
              <div className="text-right">
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">{currentTime.toLocaleTimeString()}</span>
                </div>
                <div className="text-sm text-gray-500">{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-200">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <span className="font-semibold text-gray-700">Progress</span>
                </div>
                <span className="text-2xl font-bold text-indigo-600">{progressPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="text-sm text-gray-600">{completedCount} / {suppliers.length}</div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-700">New</span>
              </div>
              <div className="text-3xl font-bold text-blue-600">{newSuppliers.length}</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-gray-700">Existing</span>
              </div>
              <div className="text-3xl font-bold text-green-600">{oldSuppliers.length}</div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-4 border-2 border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-orange-600" />
                <span className="font-semibold text-gray-700">InQFlow</span>
              </div>
              <div className="text-lg font-bold text-orange-600">{setupCount} / {suppliers.length}</div>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 border-2 border-pink-200">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-pink-600" />
                <span className="font-semibold text-gray-700">Priority</span>
              </div>
              <div className="text-3xl font-bold text-pink-600">{prioritySuppliers.length}</div>
            </div>
          </div>

          {(expiredSuppliers.length > 0 || dueSoonSuppliers.length > 0 || prioritySuppliers.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {expiredSuppliers.length > 0 && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-bold text-red-700">Expired ({expiredSuppliers.length})</span>
                  </div>
                  <div className="max-h-24 overflow-y-auto text-sm space-y-1">
          {expiredSuppliers.slice(0, 5).map(s => (
                  <div key={s.id} className="text-gray-700">• {s.supplierName}</div>
                ))}
                {expiredSuppliers.length > 5 && <div className="text-red-600 font-medium">+{expiredSuppliers.length - 5} more</div>}
              </div>
            </div>
          )}

          {dueSoonSuppliers.length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="font-bold text-yellow-700">Due Soon ({dueSoonSuppliers.length})</span>
              </div>
              <div className="max-h-24 overflow-y-auto text-sm space-y-1">
                {dueSoonSuppliers.slice(0, 5).map(s => (
                  <div key={s.id} className="text-gray-700">• {s.supplierName}</div>
                ))}
                {dueSoonSuppliers.length > 5 && <div className="text-yellow-600 font-medium">+{dueSoonSuppliers.length - 5} more</div>}
              </div>
            </div>
          )}

          {prioritySuppliers.length > 0 && (
            <div className="bg-pink-50 border-2 border-pink-300 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-pink-600" />
                <span className="font-bold text-pink-700">Priority ({prioritySuppliers.length})</span>
              </div>
              <div className="max-h-24 overflow-y-auto text-sm space-y-1">
                {prioritySuppliers.slice(0, 5).map(s => (
                  <div key={s.id} className="text-gray-700">• {s.supplierName}</div>
                ))}
                {prioritySuppliers.length > 5 && <div className="text-pink-600 font-medium">+{prioritySuppliers.length - 5} more</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>

    {/* Actions */}
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <div className="flex gap-3 flex-wrap mb-4">
        <button onClick={addSupplier} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md">
          <Plus className="w-5 h-5" />Add Supplier
        </button>
        <button onClick={() => setShowImportList(!showImportList)} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md">
          <Upload className="w-5 h-5" />Import List
        </button>
        <button onClick={downloadTemplate} className="flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 shadow-md">
          <Download className="w-5 h-5" />Template
        </button>
        <button onClick={exportCSV} className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md">
          <Download className="w-5 h-5" />Export
        </button>
        <button onClick={() => setShowUpload(!showUpload)} className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-md">
          <Upload className="w-5 h-5" />Restore
        </button>
        <button onClick={performBackup} className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-md">
          <Bell className="w-5 h-5" />Send Report
        </button>
      </div>

      {showImportList && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">📋 Import Supplier List (Name, Contact)</label>
          <input type="file" accept=".csv" onChange={importSupplierList} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700" />
        </div>
      )}

      {showUpload && (
        <div className="mb-4 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">🔄 Restore Full Backup</label>
          <input type="file" accept=".csv" onChange={importCSV} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700" />
        </div>
      )}

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search suppliers by name, contact, insurance, GST, WCB..."
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex gap-4 flex-wrap items-center pt-4 border-t">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <span className="font-semibold text-gray-700">Filters:</span>
        </div>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="px-4 py-2 border rounded-lg">
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="incomplete">Incomplete</option>
        </select>
        <select value={filterSupplierType} onChange={(e) => { setFilterSupplierType(e.target.value); setCurrentPage(1); }} className="px-4 py-2 border rounded-lg">
          <option value="all">All Types</option>
          <option value="Company">Company</option>
          <option value="Individual">Individual</option>
        </select>
        <select value={filterNewSupplier} onChange={(e) => { setFilterNewSupplier(e.target.value); setCurrentPage(1); }} className="px-4 py-2 border rounded-lg">
          <option value="all">All Suppliers</option>
          <option value="Yes">New</option>
          <option value="No">Existing</option>
        </select>
        <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }} className="px-4 py-2 border rounded-lg">
          <option value="all">All Priority</option>
          <option value="priority">Priority Only</option>
          <option value="normal">Normal</option>
        </select>
        <div className="flex items-center gap-2 ml-4">
          <ArrowUpDown className="w-5 h-5 text-gray-600" />
          <span className="font-semibold text-gray-700">Sort:</span>
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-2 border rounded-lg">
          <option value="name">Name</option>
          <option value="status">Status</option>
          <option value="type">Type</option>
          <option value="new">New/Existing</option>
          <option value="priority">Priority</option>
        </select>
        <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
          {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
        </button>
        <div className="ml-auto text-sm text-gray-600">
          Showing {indexOfFirst + 1}-{Math.min(indexOfLast, filteredSuppliers.length)} of {filteredSuppliers.length}
        </div>
      </div>
    </div>

    {/* Table */}
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <tr>
              <th className="px-3 py-4 text-left text-xs font-semibold">Priority</th>
              <th className="px-3 py-4 text-left text-xs font-semibold">Status</th>
              <th className="px-3 py-4 text-left text-xs font-semibold">Name</th>
              <th className="px-3 py-4 text-left text-xs font-semibold">Contact</th>
              <th className="px-3 py-4 text-left text-xs font-semibold">Type</th>
              <th className="px-3 py-4 text-left text-xs font-semibold">New/Existing</th>
              <th className="px-3 py-4 text-left text-xs font-semibold">Labour</th>
              <th className="px-3 py-4 text-left text-xs font-semibold">InQFlow</th>
              <th className="px-3 py-4 text-left text-xs font-semibold">Insurance</th>
              <th className="px-3 py-4 text-left text-xs font-semibold">GST</th>
              <th className="px-3 py-4 text-left text-xs font-semibold">WCB</th>
              <th className="px-3 py-4 text-left text-xs font-semibold">Last Check</th>
              <th className="px-3 py-4 text-left text-xs font-semibold">Notes</th>
              <th className="px-3 py-4 text-center text-xs font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {currentSuppliers.length === 0 ? (
              <tr><td colSpan="14" className="px-4 py-12 text-center text-gray-500">
                {suppliers.length === 0 ? "No suppliers. Click 'Add Supplier'." : "No suppliers match filters."}
              </td></tr>
            ) : (
              currentSuppliers.map((s) => (
                <tr key={s.id} className={`hover:bg-gray-50 ${s.priority ? 'bg-pink-50' : ''}`}>
                  <td className="px-3 py-3">
                    <button onClick={() => togglePriority(s.id)} className={`p-1 rounded ${s.priority ? 'text-pink-600' : 'text-gray-300'}`}>
                      <Star className="w-5 h-5" fill={s.priority ? 'currentColor' : 'none'} />
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${s.completed ? 'bg-green-100' : 'bg-red-100'}`}>
                      {s.completed ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-600" />}
                    </div>
                  </td>
                  {editingId === s.id ? (
                    <>
                      <td className="px-3 py-3"><input type="text" value={editingData.supplierName} onChange={(e) => setEditingData({...editingData, supplierName: e.target.value})} className="w-full px-2 py-1 text-sm border rounded" /></td>
                      <td className="px-3 py-3"><input type="text" value={editingData.contactInfo} onChange={(e) => setEditingData({...editingData, contactInfo: e.target.value})} className="w-full px-2 py-1 text-sm border rounded" /></td>
                      <td className="px-3 py-3"><select value={editingData.supplierType} onChange={(e) => setEditingData({...editingData, supplierType: e.target.value})} className="w-full px-2 py-1 text-sm border rounded"><option value="Company">Company</option><option value="Individual">Individual</option></select></td>
                      <td className="px-3 py-3"><select value={editingData.isNewSupplier} onChange={(e) => setEditingData({...editingData, isNewSupplier: e.target.value})} className="w-full px-2 py-1 text-sm border rounded"><option value="Yes">New</option><option value="No">Existing</option></select></td>
                      <td className="px-3 py-3"><select value={editingData.labourInvolved} onChange={(e) => setEditingData({...editingData, labourInvolved: e.target.value})} className="w-full px-2 py-1 text-sm border rounded"><option value="Yes">Yes</option><option value="No">No</option></select></td>
                      <td className="px-3 py-3"><select value={editingData.setupInQflow} onChange={(e) => setEditingData({...editingData, setupInQflow: e.target.value})} className="w-full px-2 py-1 text-sm border rounded"><option value="No">No</option><option value="Yes">Yes</option></select></td>
                      <td className="px-3 py-3"><input type="text" value={editingData.insuranceLiability} onChange={(e) => setEditingData({...editingData, insuranceLiability: e.target.value})} className="w-full px-2 py-1 text-sm border rounded" disabled={editingData.labourInvolved === 'No'} /></td>
                      <td className="px-3 py-3"><input type="text" value={editingData.gstNumber} onChange={(e) => setEditingData({...editingData, gstNumber: e.target.value})} className="w-full px-2 py-1 text-sm border rounded" disabled={editingData.labourInvolved === 'No'} /></td>
                      <td className="px-3 py-3"><input type="text" value={editingData.wcbClearance} onChange={(e) => setEditingData({...editingData, wcbClearance: e.target.value})} className="w-full px-2 py-1 text-sm border rounded" disabled={editingData.labourInvolved === 'No'} /></td>
                      <td className="px-3 py-3 text-xs">{s.lastComplianceCheck ? new Date(s.lastComplianceCheck).toLocaleDateString() : '-'}</td>
                      <td className="px-3 py-3"><button onClick={() => openNoteModal(s)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"><MessageSquare className="w-3 h-3 inline mr-1" />{(s.notes || []).length}</button></td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <button onClick={saveEdit} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Save</button>
                          <button onClick={cancelEdit} className="px-2 py-1 bg-gray-600 text-white rounded text-xs">Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-3 font-medium text-sm">{s.supplierName}</td>
                      <td className="px-3 py-3 text-sm">{s.contactInfo}</td>
                      <td className="px-3 py-3"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${s.supplierType === 'Company' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{s.supplierType === 'Company' ? <Building className="w-3 h-3" /> : <User className="w-3 h-3" />}{s.supplierType}</span></td>
                      <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs ${s.isNewSupplier === 'Yes' ? 'bg-cyan-100 text-cyan-700' : 'bg-emerald-100 text-emerald-700'}`}>{s.isNewSupplier === 'Yes' ? '🆕 New' : '✓ Existing'}</span></td>
                      <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs ${s.labourInvolved === 'Yes' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>{s.labourInvolved}</span></td>
                      <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs ${s.setupInQflow === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{s.setupInQflow === 'Yes' ? '✓ Setup' : '⏳ Pending'}</span></td>
                      <td className="px-3 py-3 text-sm">{s.insuranceLiability || '-'}</td>
                      <td className="px-3 py-3 text-sm">{s.gstNumber || '-'}</td>
                      <td className="px-3 py-3 text-sm">{s.wcbClearance || '-'}</td>
                      <td className="px-3 py-3 text-xs">{s.lastComplianceCheck ? new Date(s.lastComplianceCheck).toLocaleDateString() : '-'}</td>
                      <td className="px-3 py-3"><button onClick={() => openNoteModal(s)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"><MessageSquare className="w-3 h-3 inline mr-1" />{(s.notes || []).length}</button></td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(s)} className="px-2 py-1 bg-indigo-600 text-white rounded text-xs">Edit</button>
                          <button onClick={() => deleteSupplier(s.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-indigo-600 text-white rounded disabled:bg-gray-300">Previous</button>
          <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-indigo-600 text-white rounded disabled:bg-gray-300">Next</button>
        </div>
      )}
    </div>

    <div className="mt-8 pt-6 border-t border-gray-200 text-center">
      <p className="text-sm text-gray-500">© 2025 Zeyong Jin. All Rights Reserved.</p>
    </div>
  </div>

  {/* Note Modal */}
  {showNoteModal && currentNoteSupplier && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Notes for {currentNoteSupplier.supplierName || 'Supplier'}
          </h2>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {currentNoteSupplier.notes && currentNoteSupplier.notes.length > 0 ? (
            <div className="mb-6 space-y-3">
              <h3 className="font-semibold text-gray-700 mb-3">Previous Notes:</h3>
              {currentNoteSupplier.notes.map((note) => (
                <div key={note.id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-indigo-500">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-indigo-600">{note.user}</span>
                    <span className="text-xs text-gray-500">{new Date(note.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-gray-700">{note.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-6 text-center text-gray-500 py-4">No notes yet.</div>
          )}
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Add Note:</label>
            <textarea value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500" rows="4" placeholder="Enter note..." />
          </div>
        </div>
        <div className="bg-gray-50 p-6 flex justify-end gap-3">
          <button onClick={() => { setShowNoteModal(false); setNewNoteText(''); setCurrentNoteSupplier(null); }} className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">Close</button>
          <button onClick={addNote} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add Note</button>
        </div>
      </div>
    </div>
  )}

  {/* Help Modal - Part 1 */}
  {showHelp && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="w-6 h-6" />
            User Manual & Help Guide
          </h2>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            <section>
              <h3 className="text-xl font-bold text-indigo-600 mb-3">🎯 Getting Started</h3>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Login:</strong> Use your name and password: <code className="bg-gray-100 px-2 py-1 rounded">apvan2025</code></li>
                <li><strong>Dashboard:</strong> View progress, new/existing suppliers, priority items, and compliance alerts</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-indigo-600 mb-3">➕ Adding Suppliers</h3>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Single:</strong> Click "Add Supplier" button, fill details, click Save</li>
                <li><strong>Bulk Import:</strong> Click "Import List", upload CSV with Name and Contact columns</li>
                <li><strong>Template:</strong> Download template CSV by clicking "Template" button</li>
                <li><strong>Large Imports:</strong> System can handle 30,000+ suppliers with pagination</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-indigo-600 mb-3">🔍 Search & Filter</h3>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Search:</strong> Type in search box - matches name, contact, insurance, GST, WCB (case-insensitive, partial match)</li>
                <li><strong>Example:</strong> Search "landscaping" finds all suppliers with "landscaping" anywhere in their details</li>
                <li><strong>Filters:</strong> Status, Type, New/Existing, Priority</li>
                <li><strong>Sort:</strong> By name, status, type, new/existing, priority (ascending/descending)</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-indigo-600 mb-3">⭐ Priority System</h3>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Mark Priority:</strong> Click star icon on any supplier</li>
                <li><strong>Priority Alert:</strong> Priority suppliers shown in pink alert box at top with count</li>
                <li><strong>Visual Cue:</strong> Priority rows have pink background in table</li>
                <li><strong>Filter:</strong> Use Priority filter to show only priority items</li>
                <li><strong>Purpose:</strong> Flag suppliers needing urgent attention for your team</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-indigo-600 mb-3">📋 Compliance Tracking</h3>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Required Docs:</strong> Insurance, GST, WCB (only if Labour Involved = Yes)</li>
                <li><strong>Auto-Complete:</strong> If Labour = No, marked complete automatically</li>
                <li><strong>Last Check Date:</strong> Recorded when supplier completed and setup in InQFlow</li>
                <li><strong>Expiry Alerts:</strong> Red alert for >1 year, yellow for 11-12 months</li>
                <li><strong>Re-check Board:</strong> Top dashboard shows suppliers needing re-compliance</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-indigo-600 mb-3">📧 Daily Reports</h3>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Automatic:</strong> Sent daily at 5 PM to zeyong.jin@ranchogroup.com</li>
                <li><strong>Manual:</strong> Click "Send Report" button anytime</li>
                <li><strong>Contents:</strong> Progress, counts, priority list, expired/due soon alerts</li>
                <li><strong>CSV Attachment:</strong> Full backup attached to email</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-indigo-600 mb-3">💾 Data & Backup</h3>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Auto-Save:</strong> Changes saved to Firebase and local storage automatically</li>
                <li><strong>Offline Mode:</strong> Works offline - syncs when back online</li>
                <li><strong>Sync Status:</strong> Green = synced, Yellow = local/offline, click "Retry Sync"</li>
                <li><strong>Export:</strong> Download CSV backup anytime</li>
                <li><strong>Restore:</strong> Upload previous backup CSV to restore data</li>
                <li><strong>Capacity:</strong> Can store 30,000+ suppliers reliably</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-indigo-600 mb-3">📝 Notes System</h3>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Add Notes:</strong> Click note icon (shows count), write note, click Add</li>
                <li><strong>View History:</strong> All notes timestamped with username</li>
                <li><strong>Multiple Notes:</strong> Unlimited notes per supplier</li>
                <li><strong>Team Collaboration:</strong> See who added what and when</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-indigo-600 mb-3">⚡ Performance Tips</h3>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Pagination:</strong> 50 suppliers per page for fast loading</li>
                <li><strong>Search First:</strong> Use search to narrow down before filtering</li>
                <li><strong>Regular Exports:</strong> Export backups weekly for safety</li>
                <li><strong>Large Imports:</strong> Can import 30k+ suppliers at once</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-indigo-600 mb-3">🆘 Troubleshooting</h3>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Sync Failed:</strong> Check internet, click "Retry Sync" button</li>
                <li><strong>Import Failed:</strong> Check CSV format (Name, Contact columns with header)</li>
                <li><strong>Slow Performance:</strong> Use search/filters to reduce displayed items</li>
                <li><strong>Email Not Received:</strong> Check spam, verify EmailJS setup</li>
              </ul>
            </section>
          </div>
        </div>
        <div className="bg-gray-50 p-6 flex justify-end">
          <button onClick={() => setShowHelp(false)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Close</button>
        </div>
      </div>
    </div>
  )}
</div>
    );
  };
