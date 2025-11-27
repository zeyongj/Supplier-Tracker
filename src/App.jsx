import React, { useState, useEffect } from 'react';
import { Download, Upload, LogOut, Plus, Trash2, Check, X, Clock, TrendingUp, MessageSquare, Filter, ArrowUpDown } from 'lucide-react';

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
  const [filterNewSupplier, setFilterNewSupplier] = useState('all');

  // Load data from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await window.storage.get('suppliers-data');
        if (result) {
          const data = JSON.parse(result.value);
          setSuppliers(data.suppliers || []);
          setLastBackup(data.lastBackup);
        }
      } catch (error) {
        console.log('No existing data found, starting fresh');
      }
    };
    loadData();
  }, []);

  // Save data to storage whenever suppliers change
  useEffect(() => {
    if (suppliers.length > 0 || isLoggedIn) {
      saveData();
    }
  }, [suppliers]);

  const saveData = async () => {
    try {
      setSaveStatus('Saving...');
      const data = {
        suppliers,
        lastBackup,
        lastSaved: new Date().toISOString()
      };
      await window.storage.set('suppliers-data', JSON.stringify(data));
      setSaveStatus('All changes saved ✓');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      setSaveStatus('Error saving data');
      console.error('Save error:', error);
    }
  };

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
      insuranceLiability: '',
      gstNumber: '',
      wcbClearance: '',
      newSupplier: 'Yes',
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
    const completed = !!(
      editingData.insuranceLiability?.trim() &&
      editingData.gstNumber?.trim() &&
      editingData.wcbClearance?.trim()
    );

    const updatedSupplier = {
      ...editingData,
      newSupplier: editingData.newSupplier || 'No', // Ensure newSupplier is saved
      lastModifiedTime: new Date().toISOString(),
      lastModifiedUser: currentUser,
      completed
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
      'Insurance Liability',
      'GST Number',
      'WCB Clearance Letter',
      'New Supplier',
      'Notes',
      'Last Modified Time',
      'Last Modified User',
      'Completed'
    ];

    const rows = suppliers.map(s => [
      s.supplierName,
      s.contactInfo,
      s.insuranceLiability,
      s.gstNumber,
      s.wcbClearance,
      s.newSupplier,
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
          
          const notesText = values[6] || '';
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
            insuranceLiability: values[2] || '',
            gstNumber: values[3] || '',
            wcbClearance: values[4] || '',
            newSupplier: values[5] || 'No',
            notes: notes,
            lastModifiedTime: new Date().toISOString(),
            lastModifiedUser: currentUser,
            completed: values[9] === 'Yes'
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
        
        // Skip header row and import
        const newSuppliers = lines.slice(1).map((line, index) => {
          const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => 
            v.replace(/^"|"$/g, '').replace(/""/g, '"').trim()
          ) || [];
          
          return {
            id: Date.now() + index + Math.random(),
            supplierName: values[0] || '',
            contactInfo: values[1] || '',
            insuranceLiability: '',
            gstNumber: '',
            wcbClearance: '',
            newSupplier: 'No', // All imported suppliers marked as "No"
            notes: [],
            lastModifiedTime: new Date().toISOString(),
            lastModifiedUser: currentUser,
            completed: false
          };
        });

        // Add to existing suppliers
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

    // Apply filters
    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => 
        filterStatus === 'completed' ? s.completed : !s.completed
      );
    }

    if (filterNewSupplier !== 'all') {
      filtered = filtered.filter(s => s.newSupplier === filterNewSupplier);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === 'name') {
        compareValue = (a.supplierName || '').localeCompare(b.supplierName || '');
      } else if (sortBy === 'status') {
        compareValue = (a.completed === b.completed) ? 0 : a.completed ? -1 : 1;
      } else if (sortBy === 'newSupplier') {
        compareValue = (a.newSupplier || '').localeCompare(b.newSupplier || '');
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  };

  const completedCount = suppliers.filter(s => s.completed).length;
  const totalCount = suppliers.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const filteredSuppliers = getFilteredAndSortedSuppliers();

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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-[1800px] mx-auto">
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

          {/* Progress Bar */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <span className="font-semibold text-gray-700">Overall Progress</span>
              </div>
              <span className="text-2xl font-bold text-indigo-600">
                {progressPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${progressPercent}%` }}
              >
                {progressPercent > 10 && (
                  <span className="text-xs text-white font-semibold">
                    {completedCount}/{totalCount}
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {completedCount} of {totalCount} suppliers completed
            </div>
          </div>

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
                Upload a CSV with columns: Supplier Name, Contact Info. All suppliers will be marked as "No" in New Supplier column.
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
              value={filterNewSupplier}
              onChange={(e) => setFilterNewSupplier(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Suppliers</option>
              <option value="Yes">New Suppliers</option>
              <option value="No">Existing Suppliers</option>
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
              <option value="newSupplier">New Supplier</option>
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
                  <th className="px-4 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">Supplier Name</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">Contact Info</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">Insurance</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">GST Number</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">WCB Clearance</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">New Supplier</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">Notes</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">Last Modified</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">Modified By</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="px-4 py-12 text-center text-gray-500">
                      {suppliers.length === 0 
                        ? "No suppliers yet. Click 'Add Supplier' to get started."
                        : "No suppliers match the current filters."}
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          supplier.completed ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {supplier.completed ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <X className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      </td>
                      {editingId === supplier.id ? (
                        <>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={editingData.supplierName}
                              onChange={(e) => setEditingData({...editingData, supplierName: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              placeholder="Supplier name"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={editingData.contactInfo}
                              onChange={(e) => setEditingData({...editingData, contactInfo: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              placeholder="Contact info"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={editingData.insuranceLiability}
                              onChange={(e) => setEditingData({...editingData, insuranceLiability: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              placeholder="Insurance #"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={editingData.gstNumber}
                              onChange={(e) => setEditingData({...editingData, gstNumber: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              placeholder="GST #"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={editingData.wcbClearance}
                              onChange={(e) => setEditingData({...editingData, wcbClearance: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              placeholder="WCB #"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <select
                              value={editingData.newSupplier}
                              onChange={(e) => setEditingData({...editingData, newSupplier: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => openNoteModal(supplier)}
                              className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                            >
                              <MessageSquare className="w-4 h-4" />
                              {(supplier.notes || []).length}
                            </button>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {new Date(supplier.lastModifiedTime).toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {supplier.lastModifiedUser}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={saveEdit}
                                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-4 font-medium text-gray-900">{supplier.supplierName}</td>
                          <td className="px-4 py-4 text-gray-700">{supplier.contactInfo}</td>
                          <td className="px-4 py-4 text-gray-700">{supplier.insuranceLiability}</td>
                          <td className="px-4 py-4 text-gray-700">{supplier.gstNumber}</td>
                          <td className="px-4 py-4 text-gray-700">{supplier.wcbClearance}</td>
                          <td className="px-4 py-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              supplier.newSupplier === 'Yes' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {supplier.newSupplier}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => openNoteModal(supplier)}
                              className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                            >
                              <MessageSquare className="w-4 h-4" />
                              {(supplier.notes || []).length}
                            </button>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {new Date(supplier.lastModifiedTime).toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">{supplier.lastModifiedUser}</td>
                          <td className="px-4 py-4">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => startEdit(supplier)}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteSupplier(supplier.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
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
              {/* Existing Notes */}
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

              {/* Add New Note */}
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
    </div>
  );
};

import emailjs from '@emailjs/browser';

// Initialize EmailJS
emailjs.init('0jFdO4TX9CMMKcLfe');

// Update performBackup function:
const performBackup = async () => {
  exportCSV();
  
  // Generate report
  const report = `
    Daily Supplier Compliance Report
    Date: ${new Date().toLocaleDateString()}
    
    Total Suppliers: ${totalCount}
    Completed: ${completedCount}
    Progress: ${progressPercent.toFixed(1)}%
    
    New Suppliers: ${suppliers.filter(s => s.newSupplier === 'Yes').length}
  `;

  try {
    await emailjs.send(
      'YOUR_SERVICE_ID',
      'YOUR_TEMPLATE_ID',
      {
        to_email: 'zeyong.jin@ranchogroup.com',
        subject: `Daily Supplier Report - ${new Date().toLocaleDateString()}`,
        message: report,
        completed: completedCount,
        total: totalCount,
        percentage: progressPercent.toFixed(1)
      }
    );
    console.log('Report email sent successfully');
  } catch (error) {
    console.error('Email error:', error);
  }
  
  setLastBackup(new Date().toDateString());
  saveData();
};

export default SupplierTracker;
