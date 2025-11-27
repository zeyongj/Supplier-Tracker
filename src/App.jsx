import React, { useState, useEffect } from 'react';
import { Download, Upload, LogOut, Plus, Trash2, Check, X, Clock, TrendingUp } from 'lucide-react';

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
  const [lastBackup, setLastBackup] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');

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

    const interval = setInterval(checkBackup, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [suppliers, lastBackup]);

  const handleLogin = (e) => {
    e.preventDefault();
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
      lastModifiedTime: new Date().toISOString(),
      lastModifiedUser: currentUser,
      completed: false
    };
    setSuppliers([...suppliers, newSupplier]);
    setEditingId(newSupplier.id);
    setEditingData(newSupplier);
  };

  const deleteSupplier = (id) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      setSuppliers(suppliers.filter(s => s.id !== id));
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
      lastModifiedTime: new Date().toISOString(),
      lastModifiedUser: currentUser,
      completed
    };

    setSuppliers(suppliers.map(s => 
      s.id === editingId ? updatedSupplier : s
    ));
    setEditingId(null);
    setEditingData({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingData({});
  };

  const exportCSV = () => {
    const headers = [
      'Supplier Name',
      'Contact Info',
      'Insurance Liability',
      'GST Number',
      'WCB Clearance Letter',
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
      new Date(s.lastModifiedTime).toLocaleString(),
      s.lastModifiedUser,
      s.completed ? 'Yes' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
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
    
    // In a production environment, you would send email here
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
        const headers = lines[0].split(',');
        
        const importedSuppliers = lines.slice(1).map((line, index) => {
          const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g).map(v => 
            v.replace(/^"|"$/g, '').trim()
          );
          
          return {
            id: Date.now() + index,
            supplierName: values[0] || '',
            contactInfo: values[1] || '',
            insuranceLiability: values[2] || '',
            gstNumber: values[3] || '',
            wcbClearance: values[4] || '',
            lastModifiedTime: new Date().toISOString(),
            lastModifiedUser: currentUser,
            completed: values[7] === 'Yes'
          };
        });

        setSuppliers(importedSuppliers);
        setShowUpload(false);
        alert('Data imported successfully!');
      } catch (error) {
        alert('Error importing CSV. Please check the file format.');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  const completedCount = suppliers.filter(s => s.completed).length;
  const totalCount = suppliers.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

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
          
          <form onSubmit={handleLogin} className="space-y-6">
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
                required
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter password"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
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

        {/* Action Buttons */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={addSupplier}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
            >
              <Plus className="w-5 h-5" />
              Add Supplier
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
              Import Backup
            </button>
          </div>

          {showUpload && (
            <div className="mt-4 p-4 bg-purple-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload CSV Backup File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={importCSV}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
              />
            </div>
          )}
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
                  <th className="px-4 py-4 text-left text-sm font-semibold">Insurance Liability</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">GST Number</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">WCB Clearance</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">Last Modified</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">Modified By</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-12 text-center text-gray-500">
                      No suppliers yet. Click "Add Supplier" to get started.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          supplier.completed 
                            ? 'bg-green-100' 
                            : 'bg-red-100'
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
    </div>
  );
};

export default SupplierTracker;
