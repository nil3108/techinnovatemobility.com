import { useState } from 'react';
import { Users, CheckCircle2, X, Loader2 } from 'lucide-react';

interface OwnerRegistrationProps {
  onClose: () => void;
  onRegistrationSuccess: (ownerData: any) => void;
}

export default function OwnerRegistration({ onClose, onRegistrationSuccess }: OwnerRegistrationProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    email: '',
    businessName: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { registerOwner } = await import('../utils/googleSheetsApi');
      
      const result = await registerOwner({
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        businessName: formData.businessName,
        password: formData.password
      });

      if (result.success) {
        onRegistrationSuccess(result.owner);
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (err: any) {
      setError('Registration failed. Please try again.');
      console.error('Registration error:', err);
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#EE2726]/10 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5 text-[#EE2726]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Fleet Owner Registration</h2>
              <p className="text-xs text-slate-500">Create your account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Name Fields */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">
                  First Name <span className="text-[#EE2726]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#EE2726] focus:border-transparent"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#EE2726] focus:border-transparent"
                  placeholder="Michael"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">
                  Last Name <span className="text-[#EE2726]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#EE2726] focus:border-transparent"
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">
                Phone Number <span className="text-[#EE2726]">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#EE2726] focus:border-transparent"
                placeholder="+91 98765 43210"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">
                Email Address <span className="text-[#EE2726]">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#EE2726] focus:border-transparent"
                placeholder="owner@company.com"
              />
            </div>

            {/* Business Name (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">
                Business Name <span className="text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#EE2726] focus:border-transparent"
                placeholder="ABC Transport Pvt Ltd"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">
                Password <span className="text-[#EE2726]">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#EE2726] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">
                Confirm Password <span className="text-[#EE2726]">*</span>
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#EE2726] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <p className="text-xs text-rose-600 font-medium">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                loading
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-[#EE2726] hover:bg-red-700 text-white shadow-lg shadow-red-100'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Create Account
                </>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
