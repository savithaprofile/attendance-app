
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
  FiDownload
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Attendance Dashboard</h1>
          <p className="text-gray-600">{filteredData.length} records found</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={handleDownloadExcel} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Download as Excel
          </button>
          <button onClick={handleDownloadPDF} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            Download as PDF
          </button>
          <button onClick={handleAddEmployee} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            <FiUserPlus className="inline-block mr-2" />
            Add New Employee
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="border p-2 rounded" />
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="border p-2 rounded" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border p-2 rounded">
          <option value="all">All Types</option>
          <option value="check-in">Check In</option>
          <option value="check-out">Check Out</option>
        </select>
        <select value={officeFilter} onChange={e => setOfficeFilter(e.target.value)} className="border p-2 rounded">
          <option value="all">All Locations</option>
          <option value="yes">In Office</option>
          <option value="no">Remote</option>
        </select>
      </div>

      <div id="attendance-table" className="overflow-auto bg-white rounded shadow">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Time</th>
              <th className="p-2 text-left">Location</th>
              <th className="p-2 text-left">In Office</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((record) => (
              <tr key={record._id} className="border-t hover:bg-gray-50">
                <td className="p-2">{record.user?.name || 'Unknown'}</td>
                <td className="p-2">{record.type}</td>
                <td className="p-2">{formatDate(record.timestamp)}</td>
                <td className="p-2">{formatTime(record.timestamp)}</td>
                <td className="p-2">{record.location || 'N/A'}</td>
                <td className="p-2">{record.isInOffice ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
