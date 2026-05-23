import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin } from 'lucide-react';
import Footer from '../components/Footer';

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-white pt-32 pb-0 flex flex-col justify-between">
      <div className="max-w-4xl mx-auto px-6 w-full mb-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 text-center">
            Contact Us
          </h1>
          <p className="text-lg text-slate-600 mb-12 text-center max-w-2xl mx-auto">
            Get in touch with our expert technician team for specialized machine diagnostics and technical assistance.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-full bg-[#E5E7EB]/20 text-[#E5E7EB] flex items-center justify-center mb-6">
                <Mail size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Email Support</h3>
              <a href="mailto:smartfix@tecdia.co.jp" className="text-slate-600 hover:text-[#E5E7EB] transition-colors">
                smartfix@tecdia.co.jp
              </a>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-full bg-[#E5E7EB]/20 text-[#E5E7EB] flex items-center justify-center mb-6">
                <Phone size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Technician Hotline</h3>
              <a href="tel:+813XXXXXXXX" className="text-slate-600 hover:text-[#E5E7EB] transition-colors">
                +81-3-XXXX-XXXX
              </a>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-full bg-[#E5E7EB]/20 text-[#E5E7EB] flex items-center justify-center mb-6">
                <MapPin size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Office</h3>
              <p className="text-slate-600">
                1-2-3 Tech District<br />
                Tokyo, Japan
              </p>
            </div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default ContactPage;
