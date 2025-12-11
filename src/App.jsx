import React, { useState, useEffect, useMemo } from 'react';
import { Download, Upload, LogOut, Plus, Trash2, Check, X, Clock, TrendingUp, MessageSquare, Filter, ArrowUpDown, AlertCircle, Building, User, Briefcase, Search, Star, HelpCircle, RefreshCw, Bell, LayoutDashboard, List, ChevronRight, Calendar, UserCheck, AlertTriangle, Info } from 'lucide-react';
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
  const [filterRecheck, setFilterRecheck] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [useLocalStorage, setUseLocalStorage] = useState(false);
  const [syncStatus, setSyncStatus] = useState('synced');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hoveredSupplier, setHoveredSupplier] = useState(null);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  const LOCAL_STORAGE_KEY = 'supplier-tracker-local-data';

  // Load data from Firebase or localStorage
  useEffect(() => {
const loadData = async () => {
  try {
    // First try to load metadata
    const metaRef = doc(db, 'suppliers', 'metadata');
    const metaSnap = await getDoc(metaRef);
    
    if (metaSnap.exists()) {
      const meta = metaSnap.data();
      const allSuppliers = [];
      
      // Load all chunks
      for (let i = 0; i < meta.totalChunks; i++) {
        const chunkRef = doc(db, 'suppliers', `chunk_${i}`);
        const chunkSnap = await getDoc(chunkRef);
        if (chunkSnap.exists()) {
          allSuppliers.push(...chunkSnap.data().suppliers);
        }
      }
      
      setSuppliers(allSuppliers);
      setLastBackup(meta.lastBackup);
      setUseLocalStorage(false);
      setSyncStatus('synced');
      console.log(`✅ Loaded ${allSuppliers.length} suppliers from Firebase`);
    } else {
      // Try old format (single document)
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
        // Load from localStorage
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


// Debounced auto-save to prevent Firebase quota issues
const saveTimeoutRef = React.useRef(null);

useEffect(() => {
  if (suppliers.length > 0 || isLoggedIn) {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Save to localStorage immediately (free, no quota)
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
    
    // Debounce Firebase save - wait 3 seconds of no changes before saving
    saveTimeoutRef.current = setTimeout(() => {
      saveToFirebase();
    }, 3000);
  }
  
  return () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  };
}, [suppliers, lastBackup]);

useEffect(() => {
  const timer = setInterval(() => setCurrentTime(new Date()), 1000);
  return () => clearInterval(timer);
}, []);

useEffect(() => {
  const checkBackup = () => {
    const now = new Date();
    const todayDate = now.toDateString();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    if (currentHour === 17 && currentMinute < 5 && lastBackup !== todayDate) {
      performBackup();
    }
  };
  const interval = setInterval(checkBackup, 30000);
  checkBackup();
  return () => clearInterval(interval);
}, [suppliers, lastBackup]);

// Debounce search query to prevent lag
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearchQuery(searchQuery);
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery]);

const saveToFirebase = async () => {
  try {
    const CHUNK_SIZE = 1000; // 1000 suppliers per document
    const chunks = [];
    
    for (let i = 0; i < suppliers.length; i += CHUNK_SIZE) {
      chunks.push(suppliers.slice(i, i + CHUNK_SIZE));
    }
    
    // Save each chunk as a separate document
    for (let i = 0; i < chunks.length; i++) {
      await setDoc(doc(db, 'suppliers', `chunk_${i}`), {
        suppliers: chunks[i],
        chunkIndex: i,
        totalChunks: chunks.length,
        lastSaved: new Date().toISOString()
      });
    }
    
    // Save metadata
    await setDoc(doc(db, 'suppliers', 'metadata'), {
      totalChunks: chunks.length,
      totalSuppliers: suppliers.length,
      lastBackup,
      lastSaved: new Date().toISOString()
    });
    
    setSyncStatus('synced');
    setUseLocalStorage(false);
    console.log(`✅ Synced to Firebase (${chunks.length} chunks)`);
  } catch (error) {
    console.error('Firebase sync failed:', error);
    setSyncStatus('offline');
    setUseLocalStorage(true);
  }
};

const retrySyncToFirebase = async () => {
  setSyncStatus('syncing');
  try {
    const CHUNK_SIZE = 1000;
    const chunks = [];
    
    for (let i = 0; i < suppliers.length; i += CHUNK_SIZE) {
      chunks.push(suppliers.slice(i, i + CHUNK_SIZE));
    }
    
    for (let i = 0; i < chunks.length; i++) {
      await setDoc(doc(db, 'suppliers', `chunk_${i}`), {
        suppliers: chunks[i],
        chunkIndex: i,
        totalChunks: chunks.length,
        lastSaved: new Date().toISOString()
      });
    }
    
    await setDoc(doc(db, 'suppliers', 'metadata'), {
      totalChunks: chunks.length,
      totalSuppliers: suppliers.length,
      lastBackup,
      lastSaved: new Date().toISOString()
    });
    
    setSyncStatus('synced');
    setUseLocalStorage(false);
    alert(`✅ Successfully synced ${suppliers.length} suppliers to Firebase!`);
  } catch (error) {
    setSyncStatus('offline');
    alert('❌ Sync failed: ' + error.message);
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
    setActiveTab('list');
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
  const updatedSuppliers = suppliers.map(s => 
    s.id === id ? { ...s, priority: !s.priority, lastModifiedUser: currentUser, lastModifiedTime: new Date().toISOString() } : s
  );
  setSuppliers(updatedSuppliers);
  
  // Force immediate save to localStorage
  const data = {
    suppliers: updatedSuppliers,
    lastBackup,
    lastSaved: new Date().toISOString()
  };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
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

  // Enhanced template with all columns
const downloadTemplate = () => {
  const template = `Supplier Name,Contact Info,Supplier Type,New/Existing,Labour Involved,Setup in InQFlow,Insurance Liability,GST Number,WCB Clearance,Priority
Example Company 1,contact@example1.com,Company,Yes,Yes,No,,,No
Example Company 2,555-1234,Individual,No,No,No,,,No
Example Company 3,info@example3.com,Company,Yes,Yes,No,INS-12345,GST-67890,WCB-11111,No`;
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
        // Split by comma but handle quoted values
        const vals = [];
        let current = '';
        let inQuotes = false;
        
        for (let char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            vals.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        vals.push(current.trim());
        
        return {
          id: Date.now() + i,
          supplierName: vals[0] || '',
          contactInfo: vals[1] || '',
          supplierType: vals[2] || 'Company',
          isNewSupplier: vals[3] || 'Yes',
          labourInvolved: vals[4] || 'Yes',
          setupInQflow: vals[5] || 'No',
          insuranceLiability: vals[6] || '',
          gstNumber: vals[7] || '',
          wcbClearance: vals[8] || '',
          lastComplianceCheck: vals[9] || null,
          priority: (vals[10] || '').toLowerCase() === 'yes',
          notes: [],
          lastModifiedTime: new Date().toISOString(),
          lastModifiedUser: currentUser,
          completed: (vals[14] || '').toLowerCase() === 'yes'
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

  // Enhanced import function with all columns support
const importSupplierList = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      const newSuppliers = lines.slice(1).map((line, i) => {
        // Split by comma but handle quoted values
        const vals = [];
        let current = '';
        let inQuotes = false;
        
        for (let char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            vals.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        vals.push(current.trim()); // Push last value
        
        return {
          id: Date.now() + i + Math.random(),
          supplierName: vals[0] || '',
          contactInfo: vals[1] || '',
          supplierType: vals[2] || 'Company',
          isNewSupplier: vals[3] || 'Yes',
          labourInvolved: vals[4] || 'Yes',
          setupInQflow: vals[5] || 'No',
          insuranceLiability: vals[6] || '',
          gstNumber: vals[7] || '',
          wcbClearance: vals[8] || '',
          lastComplianceCheck: null,
          priority: (vals[9] || '').toLowerCase() === 'yes',
          notes: [],
          lastModifiedTime: new Date().toISOString(),
          lastModifiedUser: currentUser,
          completed: false
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

  // Get suppliers that need recheck (over 1 year since last check) - only for completed suppliers
  const getExpiredSuppliers = () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return suppliers.filter(s => s.setupInQflow === 'Yes' && s.lastComplianceCheck && new Date(s.lastComplianceCheck) < oneYearAgo && s.completed);
  };

  // Get suppliers due soon (11-12 months) - only for completed suppliers
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

  // Get recheck status for a supplier
  const getRecheckStatus = (supplier) => {
    if (!supplier.completed || !supplier.lastComplianceCheck || supplier.setupInQflow !== 'Yes') {
      return null;
    }
    const lastCheck = new Date(supplier.lastComplianceCheck);
    const now = new Date();
    const monthsSinceCheck = (now - lastCheck) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsSinceCheck >= 12) return 'expired';
    if (monthsSinceCheck >= 11) return 'due-soon';
    return 'ok';
  };

  const getPrioritySuppliers = () => suppliers.filter(s => s.priority);

  const getFilteredAndSortedSuppliers = () => {
    let filtered = [...suppliers];

    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
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
    if (filterRecheck !== 'all') {
      filtered = filtered.filter(s => {
        const status = getRecheckStatus(s);
        if (filterRecheck === 'needs-recheck') return status === 'expired' || status === 'due-soon';
        if (filterRecheck === 'expired') return status === 'expired';
        if (filterRecheck === 'due-soon') return status === 'due-soon';
        return true;
      });
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = (a.supplierName || '').localeCompare(b.supplierName || '');
      else if (sortBy === 'status') cmp = (a.completed === b.completed) ? 0 : a.completed ? -1 : 1;
      else if (sortBy === 'type') cmp = (a.supplierType || '').localeCompare(b.supplierType || '');
      else if (sortBy === 'new') cmp = (a.isNewSupplier || '').localeCompare(b.isNewSupplier || '');
      else if (sortBy === 'priority') cmp = (a.priority === b.priority) ? 0 : a.priority ? -1 : 1;
      else if (sortBy === 'recheck') {
        const statusOrder = { 'expired': 0, 'due-soon': 1, 'ok': 2, null: 3 };
        cmp = (statusOrder[getRecheckStatus(a)] || 3) - (statusOrder[getRecheckStatus(b)] || 3);
      }
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
  const needsRecheckCount = expiredSuppliers.length + dueSoonSuppliers.length;

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentSuppliers = filteredSuppliers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);

  // Format relative time
  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-200 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
              <Check className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">Supplier Tracker</h1>
            <p className="text-gray-500">Compliance Management System</p>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
              <input type="text" value={loginName} onChange={(e) => setLoginName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" placeholder="Enter your name" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input type="password" value={loginPwd} onChange={(e) => setLoginPwd(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" placeholder="Enter password" />
            </div>
            <button onClick={handleLogin}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              Sign In
            </button>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">© 2025 Zeyong Jin. All Rights Reserved.</p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Component
  const DashboardView = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="font-semibold text-gray-600 text-sm">Progress</span>
          </div>
          <div className="text-3xl font-bold text-indigo-600 mb-2">{progressPercent.toFixed(1)}%</div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="text-xs text-gray-500 mt-2">{completedCount} / {suppliers.length} completed</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-semibold text-gray-600 text-sm">New</span>
          </div>
          <div className="text-3xl font-bold text-blue-600">{newSuppliers.length}</div>
          <div className="text-xs text-gray-500 mt-2">New suppliers</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Briefcase className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="font-semibold text-gray-600 text-sm">Existing</span>
          </div>
          <div className="text-3xl font-bold text-emerald-600">{oldSuppliers.length}</div>
          <div className="text-xs text-gray-500 mt-2">Existing suppliers</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Check className="w-5 h-5 text-amber-600" />
            </div>
            <span className="font-semibold text-gray-600 text-sm">InQFlow</span>
          </div>
          <div className="text-3xl font-bold text-amber-600">{setupCount}</div>
          <div className="text-xs text-gray-500 mt-2">{notSetupCount} pending setup</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-pink-100 rounded-xl">
              <Star className="w-5 h-5 text-pink-600" />
            </div>
            <span className="font-semibold text-gray-600 text-sm">Priority</span>
          </div>
          <div className="text-3xl font-bold text-pink-600">{prioritySuppliers.length}</div>
          <div className="text-xs text-gray-500 mt-2">Need attention</div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <span className="font-semibold text-gray-600 text-sm">Recheck</span>
          </div>
          <div className="text-3xl font-bold text-red-600">{needsRecheckCount}</div>
          <div className="text-xs text-gray-500 mt-2">Need compliance check</div>
        </div>
      </div>

      {/* Alert Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Expired Suppliers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-rose-500 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <AlertCircle className="w-5 h-5" />
                <span className="font-bold">Expired Compliance</span>
              </div>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-semibold">{expiredSuppliers.length}</span>
            </div>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            {expiredSuppliers.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Check className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p>No expired suppliers</p>
              </div>
            ) : (
              <div className="space-y-2">
                {expiredSuppliers.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors cursor-pointer" onClick={() => { setActiveTab('list'); setSearchQuery(s.supplierName); }}>
                    <div>
                      <div className="font-medium text-gray-800">{s.supplierName}</div>
                      <div className="text-xs text-red-600">Last: {new Date(s.lastComplianceCheck).toLocaleDateString()}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Due Soon Suppliers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5" />
                <span className="font-bold">Due Soon (11-12mo)</span>
              </div>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-semibold">{dueSoonSuppliers.length}</span>
            </div>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            {dueSoonSuppliers.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Check className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p>No suppliers due soon</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dueSoonSuppliers.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer" onClick={() => { setActiveTab('list'); setSearchQuery(s.supplierName); }}>
                    <div>
                      <div className="font-medium text-gray-800">{s.supplierName}</div>
                      <div className="text-xs text-amber-600">Last: {new Date(s.lastComplianceCheck).toLocaleDateString()}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Priority Suppliers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Star className="w-5 h-5" />
                <span className="font-bold">Priority Items</span>
              </div>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-semibold">{prioritySuppliers.length}</span>
            </div>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            {prioritySuppliers.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Star className="w-8 h-8 mx-auto mb-2" />
                <p>No priority items</p>
              </div>
            ) : (
              <div className="space-y-2">
                {prioritySuppliers.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-pink-50 rounded-xl hover:bg-pink-100 transition-colors cursor-pointer" onClick={() => { setActiveTab('list'); setSearchQuery(s.supplierName); }}>
                    <div>
                      <div className="font-medium text-gray-800">{s.supplierName}</div>
                      <div className="text-xs text-pink-600">{s.completed ? 'Completed' : 'Incomplete'}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-indigo-600" />
          Quick Actions
        </h3>
        <div className="flex gap-3 flex-wrap">
          <button onClick={addSupplier} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all">
            <Plus className="w-4 h-4" />Add Supplier
          </button>
          <button onClick={() => { setActiveTab('list'); setShowImportList(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md transition-all">
            <Upload className="w-4 h-4" />Import List
          </button>
          <button onClick={downloadTemplate} className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 shadow-md transition-all">
            <Download className="w-4 h-4" />Template
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-md transition-all">
            <Download className="w-4 h-4" />Export
          </button>
          <button onClick={performBackup} className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 shadow-md transition-all">
            <Bell className="w-4 h-4" />Send Report
          </button>
        </div>
      </div>
    </div>
  );

// List View Component
const ListView = () => (
  <div className="space-y-4">
    {/* Actions Bar */}
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex gap-3 flex-wrap mb-4">
        <button onClick={addSupplier} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-md transition-all">
          <Plus className="w-4 h-4" />Add Supplier
        </button>
        <button onClick={() => setShowImportList(!showImportList)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md transition-all">
          <Upload className="w-4 h-4" />Import List
        </button>
        <button onClick={downloadTemplate} className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 shadow-md transition-all">
          <Download className="w-4 h-4" />Template
        </button>
        <button onClick={exportCSV} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-md transition-all">
          <Download className="w-4 h-4" />Export
        </button>
        <button onClick={() => setShowUpload(!showUpload)} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 shadow-md transition-all">
          <Upload className="w-4 h-4" />Restore
        </button>
        <button onClick={performBackup} className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 shadow-md transition-all">
          <Bell className="w-4 h-4" />Send Report
        </button>
      </div>

{showImportList && (
  <div className="mb-4 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
    <label className="block text-sm font-semibold text-gray-700 mb-2">📋 Import Supplier List (supports all columns)</label>
    <p className="text-xs text-gray-500 mb-2">Columns: Name, Contact, Type, New/Existing, Labour, InQFlow, Insurance, GST, WCB, Priority</p>
    <input 
      type="file" 
      accept=".csv"
      key="import-file-input"
      onChange={(e) => {
        if (e.target.files && e.target.files[0]) {
          importSupplierList(e);
        }
      }}
      className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer cursor-pointer" 
    />
  </div>
)}

{showUpload && (
  <div className="mb-4 p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
    <label className="block text-sm font-semibold text-gray-700 mb-2">🔄 Restore Full Backup</label>
    <input 
      type="file" 
      accept=".csv"
      key="restore-file-input"
      onChange={(e) => {
        if (e.target.files && e.target.files[0]) {
          importCSV(e);
        }
      }}
      className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer cursor-pointer" 
    />
  </div>
)}

        {/* Search */}
<div className="mb-4">
  <div className="relative">
    <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
    <input
      key="search-input"
      type="text"
      value={searchQuery}
      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
      placeholder="Search suppliers by name, contact, insurance, GST, WCB..."
      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
      autoComplete="off"
    />
  </div>
</div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="font-semibold text-gray-600 text-sm">Filters:</span>
          </div>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="incomplete">Incomplete</option>
          </select>
          <select value={filterSupplierType} onChange={(e) => { setFilterSupplierType(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Types</option>
            <option value="Company">Company</option>
            <option value="Individual">Individual</option>
          </select>
          <select value={filterNewSupplier} onChange={(e) => { setFilterNewSupplier(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Suppliers</option>
            <option value="Yes">New</option>
            <option value="No">Existing</option>
          </select>
          <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Priority</option>
            <option value="priority">Priority Only</option>
            <option value="normal">Normal</option>
          </select>
          <select value={filterRecheck} onChange={(e) => { setFilterRecheck(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Compliance</option>
            <option value="needs-recheck">Needs Recheck</option>
            <option value="expired">Expired (&gt;1yr)</option>
            <option value="due-soon">Due Soon (11-12mo)</option>
          </select>
          <div className="flex items-center gap-2 ml-auto">
            <ArrowUpDown className="w-4 h-4 text-gray-500" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="type">Type</option>
              <option value="new">New/Existing</option>
              <option value="priority">Priority</option>
              <option value="recheck">Recheck Status</option>
            </select>
            <button onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-500">
          Showing {filteredSuppliers.length > 0 ? indexOfFirst + 1 : 0}-{Math.min(indexOfLast, filteredSuppliers.length)} of {filteredSuppliers.length}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                <th className="px-3 py-4 text-left text-xs font-semibold">Modified</th>
                <th className="px-3 py-4 text-center text-xs font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentSuppliers.length === 0 ? (
                <tr><td colSpan="15" className="px-4 py-12 text-center text-gray-400">
                  {suppliers.length === 0 ? "No suppliers yet. Click 'Add Supplier' to get started." : "No suppliers match your filters."}
                </td></tr>
              ) : (
                currentSuppliers.map((s) => {
                  const recheckStatus = getRecheckStatus(s);
                  return (
                    <tr 
                      key={s.id} 
                      className={`hover:bg-gray-50 transition-colors ${s.priority ? 'bg-pink-50' : ''} ${recheckStatus === 'expired' ? 'bg-red-50' : recheckStatus === 'due-soon' ? 'bg-amber-50' : ''}`}
                    >
                      <td className="px-3 py-3">
                        <button onClick={() => togglePriority(s.id)} className={`p-1.5 rounded-lg transition-colors ${s.priority ? 'text-pink-600 bg-pink-100' : 'text-gray-300 hover:text-pink-400 hover:bg-pink-50'}`}>
                          <Star className="w-5 h-5" fill={s.priority ? 'currentColor' : 'none'} />
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${s.completed ? 'bg-green-100' : 'bg-red-100'}`}>
                          {s.completed ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-600" />}
                        </div>
                      </td>
                      {editingId === s.id ? (
                        <>
                          <td className="px-3 py-3"><input type="text" value={editingData.supplierName} onChange={(e) => setEditingData({...editingData, supplierName: e.target.value})} className="w-full px-2 py-1.5 text-sm border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500" /></td>
                          <td className="px-3 py-3"><input type="text" value={editingData.contactInfo} onChange={(e) => setEditingData({...editingData, contactInfo: e.target.value})} className="w-full px-2 py-1.5 text-sm border-2 border-indigo-300 rounded-lg" /></td>
                          <td className="px-3 py-3"><select value={editingData.supplierType} onChange={(e) => setEditingData({...editingData, supplierType: e.target.value})} className="w-full px-2 py-1.5 text-sm border-2 border-indigo-300 rounded-lg"><option value="Company">Company</option><option value="Individual">Individual</option></select></td>
                          <td className="px-3 py-3"><select value={editingData.isNewSupplier} onChange={(e) => setEditingData({...editingData, isNewSupplier: e.target.value})} className="w-full px-2 py-1.5 text-sm border-2 border-indigo-300 rounded-lg"><option value="Yes">New</option><option value="No">Existing</option></select></td>
                          <td className="px-3 py-3"><select value={editingData.labourInvolved} onChange={(e) => setEditingData({...editingData, labourInvolved: e.target.value})} className="w-full px-2 py-1.5 text-sm border-2 border-indigo-300 rounded-lg"><option value="Yes">Yes</option><option value="No">No</option></select></td>
                          <td className="px-3 py-3"><select value={editingData.setupInQflow} onChange={(e) => setEditingData({...editingData, setupInQflow: e.target.value})} className="w-full px-2 py-1.5 text-sm border-2 border-indigo-300 rounded-lg"><option value="No">No</option><option value="Yes">Yes</option></select></td>
                          <td className="px-3 py-3"><input type="text" value={editingData.insuranceLiability} onChange={(e) => setEditingData({...editingData, insuranceLiability: e.target.value})} className="w-full px-2 py-1.5 text-sm border-2 border-indigo-300 rounded-lg" disabled={editingData.labourInvolved === 'No'} /></td>
                          <td className="px-3 py-3"><input type="text" value={editingData.gstNumber} onChange={(e) => setEditingData({...editingData, gstNumber: e.target.value})} className="w-full px-2 py-1.5 text-sm border-2 border-indigo-300 rounded-lg" disabled={editingData.labourInvolved === 'No'} /></td>
                          <td className="px-3 py-3"><input type="text" value={editingData.wcbClearance} onChange={(e) => setEditingData({...editingData, wcbClearance: e.target.value})} className="w-full px-2 py-1.5 text-sm border-2 border-indigo-300 rounded-lg" disabled={editingData.labourInvolved === 'No'} /></td>
                          <td className="px-3 py-3 text-xs text-gray-500">{s.lastComplianceCheck ? new Date(s.lastComplianceCheck).toLocaleDateString() : '-'}</td>
                          <td className="px-3 py-3"><button onClick={() => openNoteModal(s)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200"><MessageSquare className="w-3 h-3 inline mr-1" />{(s.notes || []).length}</button></td>
                          <td className="px-3 py-3 text-xs text-gray-500">{formatRelativeTime(s.lastModifiedTime)}</td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              <button onClick={saveEdit} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">Save</button>
                              <button onClick={cancelEdit} className="px-3 py-1.5 bg-gray-500 text-white rounded-lg text-xs font-medium hover:bg-gray-600">Cancel</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-3">
                            <div className="font-medium text-sm text-gray-800">{s.supplierName}</div>
                            {recheckStatus && recheckStatus !== 'ok' && (
                              <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs ${recheckStatus === 'expired' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                <AlertTriangle className="w-3 h-3" />
                                {recheckStatus === 'expired' ? 'Recheck!' : 'Due soon'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600">{s.contactInfo}</td>
                          <td className="px-3 py-3"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${s.supplierType === 'Company' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{s.supplierType === 'Company' ? <Building className="w-3 h-3" /> : <User className="w-3 h-3" />}{s.supplierType}</span></td>
                          <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${s.isNewSupplier === 'Yes' ? 'bg-cyan-100 text-cyan-700' : 'bg-emerald-100 text-emerald-700'}`}>{s.isNewSupplier === 'Yes' ? '🆕 New' : '✓ Existing'}</span></td>
                          <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${s.labourInvolved === 'Yes' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{s.labourInvolved}</span></td>
                          <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${s.setupInQflow === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{s.setupInQflow === 'Yes' ? '✓ Setup' : '⏳ Pending'}</span></td>
                          <td className="px-3 py-3 text-sm text-gray-600 max-w-[100px] truncate" title={s.insuranceLiability}>{s.insuranceLiability || '-'}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 max-w-[100px] truncate" title={s.gstNumber}>{s.gstNumber || '-'}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 max-w-[100px] truncate" title={s.wcbClearance}>{s.wcbClearance || '-'}</td>
                          <td className="px-3 py-3">
                            <div className="text-xs text-gray-600">{s.lastComplianceCheck ? new Date(s.lastComplianceCheck).toLocaleDateString() : '-'}</div>
                          </td>
                          <td className="px-3 py-3"><button onClick={() => openNoteModal(s)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200 transition-colors"><MessageSquare className="w-3 h-3 inline mr-1" />{(s.notes || []).length}</button></td>
                          <td className="px-3 py-3 relative">
                            <div 
                              className="group cursor-pointer"
                              onMouseEnter={() => setHoveredSupplier(s.id)}
                              onMouseLeave={() => setHoveredSupplier(null)}
                            >
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                {formatRelativeTime(s.lastModifiedTime)}
                              </div>
                              {hoveredSupplier === s.id && (
                                <div className="absolute z-50 bottom-full left-0 mb-2 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl min-w-[180px]">
                                  <div className="font-semibold mb-1">Last Modified</div>
                                  <div className="text-gray-300">By: {s.lastModifiedUser || 'Unknown'}</div>
                                  <div className="text-gray-300">At: {s.lastModifiedTime ? new Date(s.lastModifiedTime).toLocaleString() : 'Unknown'}</div>
                                  <div className="absolute bottom-0 left-4 transform translate-y-full">
                                    <div className="border-8 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => startEdit(s)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">Edit</button>
                              <button onClick={() => deleteSupplier(s.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-100">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors">Previous</button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${currentPage === pageNum ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="text-gray-400">...</span>
                  <button onClick={() => setCurrentPage(totalPages)} className="w-10 h-10 rounded-lg font-medium bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors">{totalPages}</button>
                </>
              )}
            </div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors">Next</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1900px] mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">Supplier Tracker</h1>
                  <p className="text-xs text-gray-500">Welcome, {currentUser}</p>
                </div>
              </div>
              
              {/* Tab Navigation */}
              <nav className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                <button 
                  onClick={() => setActiveTab('dashboard')} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
                <button 
                  onClick={() => setActiveTab('list')} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  <List className="w-4 h-4" />
                  Supplier List
                </button>
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              {syncStatus !== 'synced' && (
                <button onClick={retrySyncToFirebase} className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition-colors text-sm font-medium">
                  <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'offline' ? 'Retry Sync' : 'Local Mode'}
                </button>
              )}
              <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors text-sm font-medium">
                <HelpCircle className="w-4 h-4" />
                Help
              </button>
              <div className="text-right">
                <div className="flex items-center gap-2 text-gray-700 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  {currentTime.toLocaleTimeString()}
                </div>
                <div className="text-xs text-gray-500">{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors text-sm font-medium">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1900px] mx-auto px-6 py-6">
        {activeTab === 'dashboard' ? DashboardView() : ListView()}
        
        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-400">© 2025 Zeyong Jin. All Rights Reserved.</p>
        </footer>
      </main>

      {/* Note Modal */}
      {showNoteModal && currentNoteSupplier && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="w-6 h-6" />
                Notes for {currentNoteSupplier.supplierName || 'Supplier'}
              </h2>
            </div>
            <div className="p-6 max-h-[50vh] overflow-y-auto">
              {currentNoteSupplier.notes && currentNoteSupplier.notes.length > 0 ? (
                <div className="mb-6 space-y-3">
                  <h3 className="font-semibold text-gray-700 mb-3">Previous Notes:</h3>
                  {currentNoteSupplier.notes.map((note) => (
                    <div key={note.id} className="bg-gray-50 rounded-xl p-4 border-l-4 border-indigo-500">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-indigo-600">{note.user}</span>
                        <span className="text-xs text-gray-500">{new Date(note.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-700">{note.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-6 text-center text-gray-400 py-6">No notes yet.</div>
              )}
              <div>
                <label className="block font-semibold text-gray-700 mb-2">Add Note:</label>
                <textarea value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" rows="4" placeholder="Enter note..." />
              </div>
            </div>
            <div className="bg-gray-50 p-6 flex justify-end gap-3 border-t border-gray-100">
              <button onClick={() => { setShowNoteModal(false); setNewNoteText(''); setCurrentNoteSupplier(null); }} className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-medium transition-colors">Close</button>
              <button onClick={addNote} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors">Add Note</button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <HelpCircle className="w-6 h-6" />
                User Manual & Help Guide
              </h2>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-6">
                <section>
                  <h3 className="text-lg font-bold text-indigo-600 mb-3">🎯 Getting Started</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li><strong>Login:</strong> Use your name and password: <code className="bg-gray-100 px-2 py-1 rounded">apvan2025</code></li>
                    <li><strong>Dashboard:</strong> Overview of progress, alerts, priority items, and compliance status</li>
                    <li><strong>Supplier List:</strong> Full table view with all suppliers and detailed editing</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-indigo-600 mb-3">➕ Adding Suppliers</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li><strong>Single:</strong> Click "Add Supplier" button, fill details, click Save</li>
                    <li><strong>Bulk Import:</strong> Click "Import List", upload CSV with all columns</li>
                    <li><strong>Template:</strong> Download template with all supported columns: Name, Contact, Type, New/Existing, Labour, InQFlow, Insurance, GST, WCB, Priority</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-indigo-600 mb-3">🔄 Compliance Recheck</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li><strong>Automatic Tracking:</strong> System tracks last compliance check date for completed suppliers</li>
                    <li><strong>Expired (Red):</strong> Suppliers with compliance check &gt;1 year ago need immediate recheck</li>
                    <li><strong>Due Soon (Yellow):</strong> Suppliers approaching 1 year (11-12 months) need attention</li>
                    <li><strong>Dashboard Alerts:</strong> See all suppliers needing recheck at a glance</li>
                    <li><strong>Filter:</strong> Use "Compliance" filter to show only suppliers needing recheck</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-indigo-600 mb-3">📝 Last Modified Info</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li><strong>Quick View:</strong> See relative time (e.g., "2h ago") in the Modified column</li>
                    <li><strong>Full Details:</strong> Hover over the time to see who modified and exact timestamp</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-indigo-600 mb-3">⭐ Priority System</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li><strong>Mark Priority:</strong> Click star icon on any supplier</li>
                    <li><strong>Dashboard Panel:</strong> View all priority items in dedicated panel</li>
                    <li><strong>Click to Navigate:</strong> Click any alert item to jump to that supplier</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-indigo-600 mb-3">💾 Data & Backup</h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li><strong>Auto-Save:</strong> Changes saved automatically to Firebase and local storage</li>
                    <li><strong>Export:</strong> Download full CSV backup anytime</li>
                    <li><strong>Restore:</strong> Upload previous backup to restore data</li>
                    <li><strong>Daily Report:</strong> Send email report with all stats and alerts</li>
                  </ul>
                </section>
              </div>
            </div>
            <div className="bg-gray-50 p-6 flex justify-end border-t border-gray-100">
              <button onClick={() => setShowHelp(false)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierTracker;
