import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  FiUserPlus,
  FiClock,
  FiMapPin,
  FiCheckCircle,
  FiXCircle,
  FiFilter,
  FiCalendar,
  FiUser,
  FiSearch,
  FiDownload,
  FiHome,
  FiUsers,
  FiCheckSquare,
  FiBarChart2
} from 'react-icons/fi';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Dashboard = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [officeFilter, setOfficeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const response = await axios.get('http://localhost:5000/attendance/all', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAttendanceData(response.data);
        setFilteredData(response.data);
      } catch (error) {
        setError('Failed to load attendance data.');
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [token]);

  useEffect(() => {
    let result = attendanceData;

    if (dateFilter) {
      const filterDate = new Date(dateFilter).toDateString();
      result = result.filter(record => new Date(record.timestamp).toDateString() === filterDate);
    }

    if (typeFilter !== 'all') {
      result = result.filter(record => record.type === typeFilter);
    }

    if (officeFilter !== 'all') {
      const inOffice = officeFilter === 'yes';
      result = result.filter(record => record.isInOffice === inOffice);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(record =>
        record.user?.name?.toLowerCase().includes(query) ||
        record.user?.email?.toLowerCase().includes(query)
      );
    }

    setFilteredData(result);
  }, [attendanceData, dateFilter, typeFilter, officeFilter, searchQuery]);

  // Get current day's data
  const getCurrentDayData = () => {
    const today = new Date().toDateString();
    return attendanceData.filter(record => 
      new Date(record.timestamp).toDateString() === today
    );
  };

  const currentDayData = getCurrentDayData();

  // Calculate current day's statistics
  const currentDayEmployees = [...new Set(currentDayData.map(item => item.user?._id))].filter(id => id).length;
  const currentDayCheckIns = currentDayData.filter(item => item.type === 'check-in').length;
  const currentDayCheckOuts = currentDayData.filter(item => item.type === 'check-out').length;
  const currentDayRemote = currentDayData.filter(item => !item.isInOffice).length;

  const handleAddEmployee = () => navigate('/register');

  const resetFilters = () => {
    setDateFilter('');
    setTypeFilter('all');
    setOfficeFilter('all');
    setSearchQuery('');
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const handleDownloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData.map(record => ({
      Name: record.user?.name || 'Unknown',
      Email: record.user?.email || 'N/A',
      Type: record.type,
      Date: new Date(record.timestamp).toLocaleDateString(),
      Time: new Date(record.timestamp).toLocaleTimeString(),
      Location: record.location || 'N/A',
      'In Office': record.isInOffice ? 'Yes' : 'No',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, 'attendance_report.xlsx');
  };

  const handleDownloadPDF = () => {
    const input = document.getElementById('attendance-table');
    html2canvas(input).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('attendance_report.pdf');
    });
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
  
  if (error) return (
    <div className="p-6 bg-red-50 text-red-600 rounded-lg shadow">
      {error}
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Attendance Dashboard</h1>
          <p className="text-gray-600">{filteredData.length} records found</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={handleDownloadExcel} 
            className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <FiDownload className="mr-2" />
            Excel
          </button>
          <button 
            onClick={handleDownloadPDF} 
            className="flex items-center bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <FiDownload className="mr-2" />
            PDF
          </button>
          <button 
            onClick={handleAddEmployee} 
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiUserPlus className="mr-2" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Summary Cards - Current Day Only */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-50 text-indigo-600">
              <FiUsers size={24} />
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm font-medium">Today's Employees</h3>
              <p className="text-2xl font-bold text-gray-800">{currentDayEmployees}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-50 text-green-600">
              <FiCheckSquare size={24} />
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm font-medium">Today's Check-ins</h3>
              <p className="text-2xl font-bold text-gray-800">{currentDayCheckIns}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-50 text-blue-600">
              <FiCheckCircle size={24} />
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm font-medium">Today's Check-outs</h3>
              <p className="text-2xl font-bold text-gray-800">{currentDayCheckOuts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-amber-50 text-amber-600">
              <FiHome size={24} />
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm font-medium">Today's Remote</h3>
              <p className="text-2xl font-bold text-gray-800">{currentDayRemote}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiCalendar className="text-gray-400" />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="pl-10 w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Types</option>
          <option value="check-in">Check In</option>
          <option value="check-out">Check Out</option>
        </select>
        <select
          value={officeFilter}
          onChange={e => setOfficeFilter(e.target.value)}
          className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Locations</option>
          <option value="yes">In Office</option>
          <option value="no">Remote</option>
        </select>
      </div>

      <div id="attendance-table" className="overflow-auto bg-white rounded-xl shadow-sm border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.map((record) => (
              <tr key={record._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <FiUser className="text-gray-500" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{record.user?.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{record.user?.email || 'N/A'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    record.type === 'check-in' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {record.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(record.timestamp)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatTime(record.timestamp)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <FiMapPin className="mr-1" />
                    {record.location || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {record.isInOffice ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      In Office
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                      Remote
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;