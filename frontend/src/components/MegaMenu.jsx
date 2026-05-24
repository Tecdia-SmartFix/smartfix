import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const MegaMenu = ({ isHovered, onMouseEnter, onMouseLeave }) => {
  if (!isHovered) return null;

  const linkClass = "text-[13px] text-gray-500 hover:text-black transition-colors block py-1";
  const headerClass = "text-base font-bold text-gray-900 mb-6";
  const subHeaderClass = "text-[13px] font-bold text-gray-900 mb-3 mt-6 first:mt-0";

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute top-full left-0 right-0 bg-white shadow-xl border-t border-gray-100 max-h-[85vh] overflow-y-auto z-40 text-left"
    >
      <div className="max-w-[1680px] mx-auto w-full px-5 sm:px-8 lg:px-10 py-12 flex flex-wrap lg:flex-nowrap gap-10">
        
        {/* Col 1 */}
        <div className="flex-1 min-w-[180px]">
          <h3 className={headerClass}>Products</h3>
          <div className={subHeaderClass}>Products Type</div>
          <ul className="space-y-1 mb-8">
            <li><Link to="#" className={linkClass}>DRAM</Link></li>
            <li><Link to="#" className={linkClass}>SSD</Link></li>
            <li><Link to="#" className={linkClass}>eStorage</Link></li>
            <li><Link to="#" className={linkClass}>CXL Memory</Link></li>
            <li><Link to="#" className={linkClass}>MCP</Link></li>
            <li><Link to="#" className={linkClass}>Processor</Link></li>
            <li><Link to="#" className={linkClass}>Image Sensor</Link></li>
            <li><Link to="#" className={linkClass}>Display IC</Link></li>
            <li><Link to="#" className={linkClass}>Security Solution</Link></li>
            <li><Link to="#" className={linkClass}>Power IC</Link></li>
            <li><Link to="#" className={linkClass}>LED <ArrowUpRight size={12} className="inline" /></Link></li>
            <li><Link to="#" className={linkClass}>Display <ArrowUpRight size={12} className="inline" /></Link></li>
          </ul>

          <div className={subHeaderClass}>Applications</div>
          <ul className="space-y-1">
            <li><Link to="#" className={linkClass}>AI</Link></li>
            <li><Link to="#" className={linkClass}>Server</Link></li>
            <li><Link to="#" className={linkClass}>Automotive</Link></li>
            <li><Link to="#" className={linkClass}>Network</Link></li>
            <li><Link to="#" className={linkClass}>Mobile</Link></li>
            <li><Link to="#" className={linkClass}>Lifestyle</Link></li>
          </ul>
        </div>

        {/* Col 2 */}
        <div className="flex-1 min-w-[180px]">
          <h3 className={headerClass}>Support</h3>
          <div className={subHeaderClass}>Quality Support</div>
          <ul className="space-y-1 mb-8">
            <li><Link to="#" className={linkClass}>Quality Management</Link></li>
            <li><Link to="#" className={linkClass}>Customer Service</Link></li>
            <li><Link to="#" className={linkClass}>Regulatory Information</Link></li>
            <li><Link to="#" className={linkClass}>Product Security Update</Link></li>
          </ul>

          <div className={subHeaderClass}>Tools & Resources</div>
          <ul className="space-y-1 mb-8">
            <li><Link to="#" className={linkClass}>Technical Resources</Link></li>
            <li><Link to="#" className={linkClass}>Fabrication Process</Link></li>
            <li><Link to="#" className={linkClass}>Dictionary</Link></li>
          </ul>

          <div className={subHeaderClass}>Consumer Storage Support</div>
          <ul className="space-y-1">
            <li><Link to="#" className={linkClass}>Overview</Link></li>
            <li><Link to="#" className={linkClass}>Tools & Software</Link></li>
            <li><Link to="#" className={linkClass}>Documents</Link></li>
            <li><Link to="#" className={linkClass}>FAQs</Link></li>
            <li><Link to="#" className={linkClass}>Warranty</Link></li>
            <li><Link to="#" className={linkClass}>Magician Software</Link></li>
            <li><Link to="#" className={linkClass}>SSD Upgrade</Link></li>
          </ul>
        </div>

        {/* Col 3 */}
        <div className="flex-1 min-w-[180px] pt-[48px]">
          <div className={subHeaderClass}>Collaboration Hub</div>
          <ul className="space-y-1 mb-8">
            <li><Link to="#" className={linkClass}>DS Open-Ecosystem</Link></li>
          </ul>

          <div className={subHeaderClass}>Contact Info</div>
          <ul className="space-y-1 mb-8">
            <li><Link to="#" className={linkClass}>Global Network</Link></li>
          </ul>

          <ul className="space-y-2">
            <li><Link to="#" className="text-[13px] font-bold text-gray-700 hover:text-black">B2B Workplace <ArrowUpRight size={12} className="inline" /></Link></li>
            <li><Link to="#" className="text-[13px] font-bold text-gray-700 hover:text-black">SOC-Developer <ArrowUpRight size={12} className="inline" /></Link></li>
          </ul>
        </div>

        {/* Col 4 */}
        <div className="flex-1 min-w-[180px]">
          <h3 className={headerClass}>Technologies</h3>
          <ul className="space-y-1 mb-12">
            <li><Link to="#" className={linkClass}>On-device AI</Link></li>
            <li><Link to="#" className={linkClass}>Mobile PKG</Link></li>
            <li><Link to="#" className={linkClass}>GPU Technology</Link></li>
            <li><Link to="#" className={linkClass}>ENSS</Link></li>
            <li><Link to="#" className={linkClass}>Pixel Technology</Link></li>
            <li><Link to="#" className={linkClass}>Ultra-High Resolution</Link></li>
            <li><Link to="#" className={linkClass}>HDR Technology</Link></li>
            <li><Link to="#" className={linkClass}>Remosaic Technology</Link></li>
          </ul>

          <h3 className={headerClass}>Foundry</h3>
          <ul className="space-y-1">
            <li><Link to="#" className={linkClass}>About Samsung Foundry</Link></li>
            <li><Link to="#" className={linkClass}>Process Technology</Link></li>
            <li><Link to="#" className={linkClass}>Advanced Packaging</Link></li>
            <li><Link to="#" className={linkClass}>SAFE™</Link></li>
            <li><Link to="#" className={linkClass}>Foundry Events</Link></li>
            <li><Link to="#" className={linkClass}>Manufacturing</Link></li>
            <li><Link to="#" className={linkClass}>Application Specific Service</Link></li>
            <li><Link to="#" className={linkClass}>Tech Archives</Link></li>
            <li><Link to="#" className={linkClass}>US Fab</Link></li>
            <li><Link to="#" className={linkClass}>CONNECT <ArrowUpRight size={12} className="inline" /></Link></li>
          </ul>
        </div>

        {/* Col 5 */}
        <div className="flex-1 min-w-[180px]">
          <h3 className={headerClass}>News & Events</h3>
          <ul className="space-y-1 mb-12">
            <li><Link to="#" className={linkClass}>News</Link></li>
            <li><Link to="#" className={linkClass}>Events</Link></li>
            <li><Link to="#" className={linkClass}>Tech Blog</Link></li>
          </ul>

          <h3 className={headerClass}>Sustainability</h3>
          <ul className="space-y-1">
            <li><Link to="#" className={linkClass}>Highlights</Link></li>
            <li><Link to="#" className={linkClass}>Environment</Link></li>
            <li><Link to="#" className={linkClass}>Labor & Human Rights</Link></li>
            <li><Link to="#" className={linkClass}>Corporate Citizenship</Link></li>
            <li><Link to="#" className={linkClass}>Sustainable Supply Chain</Link></li>
          </ul>
        </div>

        {/* Col 6 */}
        <div className="flex-1 min-w-[180px]">
          <h3 className={headerClass}>About Us</h3>
          <div className={subHeaderClass}>Company Info</div>
          <ul className="space-y-1 mb-8">
            <li><Link to="#" className={linkClass}>Our Story</Link></li>
            <li><Link to="#" className={linkClass}>Business Areas</Link></li>
            <li><Link to="#" className={linkClass}>Executives</Link></li>
            <li><Link to="#" className={linkClass}>History</Link></li>
            <li><Link to="#" className={linkClass}>Investor Relations <ArrowUpRight size={12} className="inline" /></Link></li>
            <li><Link to="#" className={linkClass}>Ethics <ArrowUpRight size={12} className="inline" /></Link></li>
            <li><Link to="#" className={linkClass}>Semiconductor Newsroom <ArrowUpRight size={12} className="inline" /></Link></li>
          </ul>

          <div className={subHeaderClass}>Locations</div>
          
          <div className={subHeaderClass}>Careers</div>
          <ul className="space-y-1">
            <li><Link to="#" className={linkClass}>Search Jobs</Link></li>
          </ul>
        </div>

      </div>
    </motion.div>
  );
};

export default MegaMenu;
