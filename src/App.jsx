import React, { useState, useEffect } from 'react';
import { Download, Upload, LogOut, Plus, Trash2, Check, X, Clock, TrendingUp, MessageSquare, Filter, ArrowUpDown, AlertCircle, Building, User, Briefcase } from 'lucide-react';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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

// Load data from Firebase on mount (ONE-TIME READ)
useEffect(() => {
  const loadData = async () => {
    try {
      const docRef = doc(db, 'suppliers', 'main');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSuppliers(data.suppliers || []);
        setLastBackup(data.lastBackup);
        console.log('✅ Data loaded from Firebase');
      } else {
        console.log('No data found, starting fresh');
      }
    } catch (error) {
      console.error('❌ Firebase error:', error);
    }
  };
  
  loadData();
}, []);

// Add manual refresh button if needed
const refreshData = async () => {
  try {
    const docRef = doc(db, 'suppliers', 'main');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      setSuppliers(data.suppliers || []);
      setLastBackup(data.lastBackup);
      alert('✅ Data refreshed!');
    }
  } catch (error) {
    alert('❌ Failed to refresh data');
    console.error(error);
  }
};
  
  // Save data to storage whenever suppliers change
  useEffect(() => {
    if (suppliers.length > 0 || isLoggedIn) {
      saveData();
    }
  }, [suppliers]);

  const saveData = async () => {
    try {
      const data = {
        suppliers,
        lastBackup,
        lastSaved: new Date().toISOString()
      };
      await setDoc(doc(db, 'suppliers', 'main'), data);
      console.log('✅ Data saved to Firebase');
    } catch (error) {
      console.error('❌ Firebase save error:', error);
      setSaveStatus('⚠️ Save failed - please try again');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check for expired suppliers (over 1 year since last check)
  const getExpiredSuppliers = () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    return suppliers.filter(s => {
      if (!s.setupInQflow || s.setupInQflow !== 'Yes') return false;
      if (!s.lastComplianceCheck) return false;
      const lastCheckDate = new Date(s.lastComplianceCheck);
      return lastCheckDate < oneYearAgo && s.completed;
    });
  };

  const getDueSoonSuppliers = () => {
    const elevenMonthsAgo = new Date();
    elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    return suppliers.filter(s => {
      if (!s.setupInQflow || s.setupInQflow !== 'Yes') return false;
      if (!s.lastComplianceCheck) return false;
      const lastCheckDate = new Date(s.lastComplianceCheck);
      return lastCheckDate >= oneYearAgo && lastCheckDate < elevenMonthsAgo && s.completed;
    });
  };

  // Auto-backup at 5 PM daily
  useEffect(() => {
    const checkBackup = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const today = now.toDateString();
      
      if (hours === 17 && minutes === 0 && lastBackup !== today) {
        performBackup();
      }
    };

    const interval = setInterval(checkBackup, 60000);
    return () => clearInterval(interval);
  }, [suppliers, lastBackup]);

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    if (loginPwd === 'apvan2025' && loginName.trim()) {
      setIsLoggedIn(true);
      setCurrentUser(loginName.trim());
      setLoginPwd('');
    } else {
      alert('Invalid credentials. Please check your password.');
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
      notes: [],
      lastModifiedTime: new Date().toISOString(),
      lastModifiedUser: currentUser,
      completed: false
    };
    setSuppliers([...suppliers, newSupplier]);
    setEditingId(newSupplier.id);
    setEditingData(newSupplier);
  };

  const deleteSupplier = (id) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this supplier?');
    if (confirmDelete) {
      setSuppliers(suppliers.filter(s => s.id !== id));
      setSaveStatus('Supplier deleted');
    }
  };

  const startEdit = (supplier) => {
    setEditingId(supplier.id);
    setEditingData({ ...supplier });
  };

  const saveEdit = () => {
    let completed = false;
    
    // If labour not involved, can be completed without compliance docs
    if (editingData.labourInvolved === 'No') {
      completed = true;
    } else {
      // If labour involved, need all three documents
      completed = !!(
        editingData.insuranceLiability?.trim() &&
        editingData.gstNumber?.trim() &&
        editingData.wcbClearance?.trim()
      );
    }

    const updatedSupplier = {
      ...editingData,
      lastModifiedTime: new Date().toISOString(),
      lastModifiedUser: currentUser,
      completed,
      // If completing for first time or re-completing, update lastComplianceCheck
      lastComplianceCheck: completed && editingData.setupInQflow === 'Yes' 
        ? new Date().toISOString() 
        : editingData.lastComplianceCheck
    };

    setSuppliers(suppliers.map(s => 
      s.id === editingId ? updatedSupplier : s
    ));
    setEditingId(null);
    setEditingData({});
    setSaveStatus('Changes saved successfully');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingData({});
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

    const updatedSuppliers = suppliers.map(s => {
      if (s.id === currentNoteSupplier.id) {
        return {
          ...s,
          notes: [...(s.notes || []), note],
          lastModifiedTime: new Date().toISOString(),
          lastModifiedUser: currentUser
        };
      }
      return s;
    });

    setSuppliers(updatedSuppliers);
    setShowNoteModal(false);
    setNewNoteText('');
    setCurrentNoteSupplier(null);
  };

  const exportCSV = () => {
    const headers = [
      'Supplier Name',
      'Contact Info',
      'Supplier Type',
      'New/Existing',
      'Labour Involved',
      'Setup in InQFlow',
      'Insurance Liability',
      'GST Number',
      'WCB Clearance Letter',
      'Last Compliance Check',
      'Notes',
      'Last Modified Time',
      'Last Modified User',
      'Completed'
    ];

    const rows = suppliers.map(s => [
      s.supplierName,
      s.contactInfo,
      s.supplierType,
      s.isNewSupplier,
      s.labourInvolved,
      s.setupInQflow,
      s.insuranceLiability,
      s.gstNumber,
      s.wcbClearance,
      s.lastComplianceCheck ? new Date(s.lastComplianceCheck).toLocaleDateString() : '',
      (s.notes || []).map(n => `[${new Date(n.timestamp).toLocaleString()}] ${n.user}: ${n.text}`).join(' | '),
      new Date(s.lastModifiedTime).toLocaleString(),
      s.lastModifiedUser,
      s.completed ? 'Yes' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier_backup_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const performBackup = () => {
    exportCSV();
    setLastBackup(new Date().toDateString());
    saveData();
    console.log('Backup performed and email would be sent to zeyong.jin@ranchogroup.com');
  };

  const importCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        const importedSuppliers = lines.slice(1).map((line, index) => {
          const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g).map(v => 
            v.replace(/^"|"$/g, '').replace(/""/g, '"').trim()
          );
          
          const notesText = values[10] || '';
          const notes = notesText ? notesText.split(' | ').map((noteStr, i) => ({
            id: Date.now() + i,
            text: noteStr.substring(noteStr.indexOf(': ') + 2),
            user: noteStr.match(/\] (.*?):/)?.[1] || 'Unknown',
            timestamp: new Date().toISOString()
          })) : [];
          
          return {
            id: Date.now() + index,
            supplierName: values[0] || '',
            contactInfo: values[1] || '',
            supplierType: values[2] || 'Company',
            isNewSupplier: values[3] || 'Yes',
            labourInvolved: values[4] || 'Yes',
            setupInQflow: values[5] || 'No',
            insuranceLiability: values[6] || '',
            gstNumber: values[7] || '',
            wcbClearance: values[8] || '',
            lastComplianceCheck: values[9] || null,
            notes: notes,
            lastModifiedTime: new Date().toISOString(),
            lastModifiedUser: currentUser,
            completed: values[13] === 'Yes'
          };
        });

        setSuppliers(importedSuppliers);
        setShowUpload(false);
        alert('Backup restored successfully!');
      } catch (error) {
        alert('Error importing CSV. Please check the file format.');
        console.error(error);
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
        
        const newSuppliers = lines.slice(1).map((line, index) => {
          const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => 
            v.replace(/^"|"$/g, '').replace(/""/g, '"').trim()
          ) || [];
          
          return {
            id: Date.now() + index + Math.random(),
            supplierName: values[0] || '',
            contactInfo: values[1] || '',
            supplierType: 'Company',
            isNewSupplier: 'Yes',
            labourInvolved: 'Yes',
            setupInQflow: 'No',
            insuranceLiability: '',
            gstNumber: '',
            wcbClearance: '',
            lastComplianceCheck: null,
            notes: [],
            lastModifiedTime: new Date().toISOString(),
            lastModifiedUser: currentUser,
            completed: false
          };
        });

        setSuppliers([...suppliers, ...newSuppliers]);
        setShowImportList(false);
        alert(`${newSuppliers.length} suppliers imported successfully!`);
      } catch (error) {
        alert('Error importing supplier list. Please check the file format.');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  const getFilteredAndSortedSuppliers = () => {
    let filtered = [...suppliers];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => 
        filterStatus === 'completed' ? s.completed : !s.completed
      );
    }

    if (filterSupplierType !== 'all') {
      filtered = filtered.filter(s => s.supplierType === filterSupplierType);
    }

    if (filterNewSupplier !== 'all') {
      filtered = filtered.filter(s => s.isNewSupplier === filterNewSupplier);
    }

    filtered.sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === 'name') {
        compareValue = (a.supplierName || '').localeCompare(b.supplierName || '');
      } else if (sortBy === 'status') {
        compareValue = (a.completed === b.completed) ? 0 : a.completed ? -1 : 1;
      } else if (sortBy === 'type') {
        compareValue = (a.supplierType || '').localeCompare(b.supplierType || '');
      } else if (sortBy === 'new') {
        compareValue = (a.isNewSupplier || '').localeCompare(b.isNewSupplier || '');
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  };

  const newSuppliers = suppliers.filter(s => s.isNewSupplier === 'Yes');
  const oldSuppliers = suppliers.filter(s => s.isNewSupplier === 'No');
  const notSetupCount = suppliers.filter(s => s.setupInQflow === 'No').length;
  const setupCount = suppliers.filter(s => s.setupInQflow === 'Yes').length;
  const completedCount = suppliers.filter(s => s.completed).length;
  const totalCount = suppliers.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const filteredSuppliers = getFilteredAndSortedSuppliers();
  const expiredSuppliers = getExpiredSuppliers();
  const dueSoonSuppliers = getDueSoonSuppliers();

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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={loginPwd}
                onChange={(e) => setLoginPwd(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter password"
              />
            </div>
            
            <button
              onClick={handleLogin}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg"
            >
              Sign In
            </button>
          </div>
          
          {/* Login Page Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              © 2025 Zeyong Jin. All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-[1900px] mx-auto">
        {/* Header */}
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
              <div className="text-right">
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">
                    {currentTime.toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {currentTime.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>

          {/* Progress and Statistics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Overall Progress */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-200">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <span className="font-semibold text-gray-700">Overall Progress</span>
                </div>
                <span className="text-2xl font-bold text-indigo-600">
                  {progressPercent.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-sm text-gray-600">
                {completedCount} of {totalCount} completed
              </div>
            </div>

            {/* New Suppliers Card */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-700">New Suppliers</span>
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {newSuppliers.length}
              </div>
              <div className="text-sm text-gray-600">
                Marked as new
              </div>
            </div>

            {/* Old Suppliers Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-gray-700">Existing Suppliers</span>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-1">
                {oldSuppliers.length}
              </div>
              <div className="text-sm text-gray-600">
                Marked as existing
              </div>
            </div>

            {/* InQFlow Setup Status */}
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-4 border-2 border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-orange-600" />
                <span className="font-semibold text-gray-700">InQFlow Setup</span>
              </div>
              <div className="text-lg font-bold text-orange-600 mb-1">
                {setupCount} / {totalCount}
              </div>
              <div className="text-sm text-gray-600">
                {notSetupCount} pending setup
              </div>
            </div>
          </div>

          {/* Compliance Alerts */}
          {(expiredSuppliers.length > 0 || dueSoonSuppliers.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {expiredSuppliers.length > 0 && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-bold text-red-700">⚠️ Compliance Expired</span>
                  </div>
                  <div className="text-sm text-gray-700 mb-2">
                    These suppliers need re-compliance check (over 1 year):
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {expiredSuppliers.map(s => (
                      <div key={s.id} className="text-sm bg-white rounded px-3 py-2 flex justify-between">
                        <span className="font-medium">{s.supplierName}</span>
                        <span className="text-red-600">
                          {new Date(s.lastComplianceCheck).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dueSoonSuppliers.length > 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span className="font-bold text-yellow-700">⏰ Due Soon</span>
                  </div>
                  <div className="text-sm text-gray-700 mb-2">
                    These suppliers need check within 1 month:
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {dueSoonSuppliers.map(s => (
                      <div key={s.id} className="text-sm bg-white rounded px-3 py-2 flex justify-between">
                        <span className="font-medium">{s.supplierName}</span>
                        <span className="text-yellow-600">
                          {new Date(s.lastComplianceCheck).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {saveStatus && (
            <div className="mt-4 text-sm text-green-600 font-medium">
              {saveStatus}
            </div>
          )}
        </div>

        {/* Action Buttons and Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex gap-3 flex-wrap mb-4">
            <button
              onClick={addSupplier}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
            >
              <Plus className="w-5 h-5" />
              Add Supplier
            </button>
            <button
              onClick={() => setShowImportList(!showImportList)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              <Upload className="w-5 h-5" />
              Import Supplier List
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
            >
              <Download className="w-5 h-5" />
              Export Backup
            </button>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-md"
            >
              <Upload className="w-5 h-5" />
              Restore Backup
            </button>
          </div>

          {showImportList && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📋 Upload Supplier List CSV (Supplier Name, Contact Info)
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Upload a CSV with columns: Supplier Name, Contact Info. All suppliers will be marked as not setup in InQFlow.
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={importSupplierList}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              />
            </div>
          )}

          {showUpload && (
            <div className="mb-4 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔄 Restore from Backup CSV
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Upload a previously exported backup file to restore all data.
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={importCSV}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
              />
            </div>
          )}

          {/* Filters and Sorting */}
          <div className="flex gap-4 flex-wrap items-center pt-4 border-t">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-700">Filters:</span>
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="incomplete">Incomplete</option>
            </select>

            <select
              value={filterSupplierType}
              onChange={(e) => setFilterSupplierType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="Company">Company</option>
              <option value="Individual">Individual</option>
            </select>

            <select
              value={filterNewSupplier}
              onChange={(e) => setFilterNewSupplier(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Suppliers (New & Existing)</option>
              <option value="Yes">New Suppliers Only</option>
              <option value="No">Existing Suppliers Only</option>
            </select>

            <div className="flex items-center gap-2 ml-4">
              <ArrowUpDown className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-700">Sort by:</span>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="name">Supplier Name</option>
              <option value="status">Completion Status</option>
              <option value="type">Supplier Type</option>
              <option value="new">New/Existing</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
            </button>

            <div className="ml-auto text-sm text-gray-600">
              Showing {filteredSuppliers.length} of {totalCount} suppliers
            </div>
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <tr>
                  <th className="px-3 py-4 text-left text-xs font-semibold">Status</th>
                  <th className="px-3 py-4 text-left text-xs font-semibold">Supplier Name</th>
                  <th className="px-3 py-4 text-left text-xs font-semibold">Contact Info</th>
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
                  <th className="px-3 py-4 text-left text-xs font-semibold">By</th>
                  <th className="px-3 py-4 text-center text-xs font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan="15" className="px-4 py-12 text-center text-gray-500">
                      {suppliers.length === 0 
                        ? "No suppliers yet. Click 'Add Supplier' to get started."
                        : "No suppliers match the current filters."}
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                          supplier.completed ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {supplier.completed ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      </td>
                      {editingId === supplier.id ? (
                        <>
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={editingData.supplierName}
                              onChange={(e) => setEditingData({...editingData, supplierName: e.target.value})}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                              placeholder="Name"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={editingData.contactInfo}
                              onChange={(e) => setEditingData({...editingData, contactInfo: e.target.value})}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                              placeholder="Contact"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <select
                              value={editingData.supplierType}
                              onChange={(e) => setEditingData({...editingData, supplierType: e.target.value})}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="Company">Company</option>
                              <option value="Individual">Individual</option>
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <select
                              value={editingData.isNewSupplier}
                              onChange={(e) => setEditingData({...editingData, isNewSupplier: e.target.value})}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="Yes">New</option>
                              <option value="No">Existing</option>
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <select
                              value={editingData.labourInvolved}
                              onChange={(e) => setEditingData({...editingData, labourInvolved: e.target.value})}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <select
                              value={editingData.setupInQflow}
                              onChange={(e) => setEditingData({...editingData, setupInQflow: e.target.value})}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="No">No</option>
                              <option value="Yes">Yes</option>
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={editingData.insuranceLiability}
                              onChange={(e) => setEditingData({...editingData, insuranceLiability: e.target.value})}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                              placeholder="Insurance"
                              disabled={editingData.labourInvolved === 'No'}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={editingData.gstNumber}
                              onChange={(e) => setEditingData({...editingData, gstNumber: e.target.value})}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                              placeholder="GST"
                              disabled={editingData.labourInvolved === 'No'}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={editingData.wcbClearance}
                              onChange={(e) => setEditingData({...editingData, wcbClearance: e.target.value})}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                              placeholder="WCB"
                              disabled={editingData.labourInvolved === 'No'}
                            />
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-600">
                            {supplier.lastComplianceCheck 
                              ? new Date(supplier.lastComplianceCheck).toLocaleDateString() 
                              : '-'}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => openNoteModal(supplier)}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs"
                            >
                              <MessageSquare className="w-3 h-3" />
                              {(supplier.notes || []).length}
                            </button>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-600">
                            {new Date(supplier.lastModifiedTime).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-600">
                            {supplier.lastModifiedUser}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={saveEdit}
                                className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-3 font-medium text-sm text-gray-900">{supplier.supplierName}</td>
                          <td className="px-3 py-3 text-sm text-gray-700">{supplier.contactInfo}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              supplier.supplierType === 'Company' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {supplier.supplierType === 'Company' ? <Building className="w-3 h-3" /> : <User className="w-3 h-3" />}
                              {supplier.supplierType}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              supplier.isNewSupplier === 'Yes' 
                                ? 'bg-cyan-100 text-cyan-700' 
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {supplier.isNewSupplier === 'Yes' ? '🆕 New' : '✓ Existing'}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              supplier.labourInvolved === 'Yes' 
                                ? 'bg-orange-100 text-orange-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {supplier.labourInvolved}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              supplier.setupInQflow === 'Yes' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {supplier.setupInQflow === 'Yes' ? '✓ Setup' : '⏳ Pending'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-700">{supplier.insuranceLiability || '-'}</td>
                          <td className="px-3 py-3 text-sm text-gray-700">{supplier.gstNumber || '-'}</td>
                          <td className="px-3 py-3 text-sm text-gray-700">{supplier.wcbClearance || '-'}</td>
                          <td className="px-3 py-3 text-xs text-gray-600">
                            {supplier.lastComplianceCheck 
                              ? new Date(supplier.lastComplianceCheck).toLocaleDateString() 
                              : '-'}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => openNoteModal(supplier)}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs"
                            >
                              <MessageSquare className="w-3 h-3" />
                              {(supplier.notes || []).length}
                            </button>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-600">
                            {new Date(supplier.lastModifiedTime).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-600">{supplier.lastModifiedUser}</td>
                          <td className="px-3 py-3">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => startEdit(supplier)}
                                className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteSupplier(supplier.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
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
                          <span className="text-xs text-gray-500">
                            {new Date(note.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700">{note.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mb-6 text-center text-gray-500 py-4">
                    No notes yet. Add the first note below.
                  </div>
                )}
                <div>
                  <label className="block font-semibold text-gray-700 mb-2">
                    Add New Note:
                  </label>
                  <textarea
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows="4"
                    placeholder="Enter your note here..."
                  />
                </div>
              </div>
              <div className="bg-gray-50 p-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setNewNoteText('');
                    setCurrentNoteSupplier(null);
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={addNote}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        )}
  
        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-500">
              © 2025 Zeyong Jin. All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  export default SupplierTracker;
