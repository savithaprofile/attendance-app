import React, { useState } from 'react';
import axios from 'axios';
import {
  FiUser,
  FiMail,
  FiLock,
  FiBriefcase,
  FiHome,
  FiCalendar,
  FiPhone
} from 'react-icons/fi';
import { API_ENDPOINTS } from '../utils/api';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    position: '',
    company: ''
  });

  const [weeklySchedule, setWeeklySchedule] = useState({
    Monday: { start: '09:00', end: '17:00', isLeave: false },
    Tuesday: { start: '09:00', end: '17:00', isLeave: false },
    Wednesday: { start: '09:00', end: '17:00', isLeave: false },
    Thursday: { start: '09:00', end: '17:00', isLeave: false },
    Friday: { start: '09:00', end: '17:00', isLeave: false },
    Saturday: { start: '', end: '', isLeave: true },
    Sunday: { start: '', end: '', isLeave: true }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleScheduleChange = (day, field, value) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(API_ENDPOINTS.register, {
        ...formData,
        schedule: weeklySchedule
      });
      setSuccess('🎉 User created successfully!');
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        position: '',
        company: ''
      });
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error.response?.data?.message || '❌ Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-10 border border-gray-200 animate-fade-in">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-blue-800">🚀 User Registration</h2>
          <p className="text-gray-600 mt-2">
            Fill in the details to create a user with a weekly schedule
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-100 text-red-800 border border-red-300 rounded-md text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-3 bg-green-100 text-green-800 border border-green-300 rounded-md text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField icon={<FiUser />} label="Full Name" name="name" value={formData.name} onChange={handleChange} placeholder="Jane Doe" />
            <InputField icon={<FiMail />} type="email" label="Email Address" name="email" value={formData.email} onChange={handleChange} placeholder="jane@example.com" />
            <InputField icon={<FiLock />} type="password" label="Password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" />
            
            {/* Phone Number with +91 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center">
                <FiPhone className="mr-2" /> Phone Number
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-700 text-sm">
                  +91
                </span>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  maxLength="10"
                  placeholder="9876543210"
                  className="w-full rounded-r-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <InputField icon={<FiBriefcase />} label="Position" name="position" value={formData.position} onChange={handleChange} placeholder="e.g. Fullstack Developer" />
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center">
                <FiHome className="mr-2" /> Company
              </label>
              <select
                name="company"
                value={formData.company}
                onChange={handleChange}
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Company</option>
                <option value="Jobzenter">Jobzenter</option>
                <option value="Urbancode">Urbancode</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center mb-4">
              <FiCalendar className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-xl font-semibold text-gray-800">Weekly Schedule</h3>
            </div>

            <div className="space-y-4">
              {days.map((day) => (
                <div key={day} className={`p-4 rounded-lg border ${weeklySchedule[day].isLeave ? 'bg-gray-50' : 'bg-blue-50'} border-gray-200`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={weeklySchedule[day].isLeave}
                        onChange={(e) => handleScheduleChange(day, 'isLeave', e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">{day}</span>
                    </label>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${weeklySchedule[day].isLeave ? 'bg-gray-200 text-gray-600' : 'bg-blue-200 text-blue-900'}`}>
                      {weeklySchedule[day].isLeave ? 'Day Off' : 'Working Day'}
                    </span>
                  </div>

                  {!weeklySchedule[day].isLeave && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputField label="Start Time" type="time" value={weeklySchedule[day].start} onChange={(e) => handleScheduleChange(day, 'start', e.target.value)} />
                      <InputField label="End Time" type="time" value={weeklySchedule[day].end} onChange={(e) => handleScheduleChange(day, 'end', e.target.value)} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="text-right">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center px-6 py-2 text-white text-sm font-medium rounded-md shadow-md transition bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Reusable input component
function InputField({ label, icon, name, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center">
        {icon && <span className="mr-2">{icon}</span>}
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required
        placeholder={placeholder}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}

export default Register;
