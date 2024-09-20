import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import GroupChart2 from '../../widget/chart/group-chart-2';
import Icons from '@/components/ui/Icon';
import Dropdown from '@/components/ui/Dropdown'; // Import the Dropdown component

export default function Activity() {
  const [filter, setFilter] = useState('');

  const handleFilterSelect = (value) => {
    setFilter(value);
    // Handle filter logic here based on selected value
    console.log('Selected Filter:', value);
  };

  const filterItems = [
    { label: 'Ads Display Order', value: 'ads-display-order' },
    { label: 'Advertisement', value: 'advertisement' },
    { label: 'News', value: 'news' },
    { label: 'Health', value: 'health' },
    { label: 'Events', value: 'events' },
    { label: 'Auto Slide Delay (seconds)', value: 'auto-slide-delay' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center">
        <p className="text-[#56ce84] font-semibold max-sm:text-sm">Running</p>
        <div className="flex items-center">
          <p className="flex items-center text-[#56ce84] font-semibold">
            
          </p>
          <Dropdown
           label={<><Icons icon={'hugeicons:filter'} /> Filter <Icons className={'text-2xl'} icon={'ri:arrow-drop-down-line'} /></>}
            wrapperClass="ml-2"
            labelClass="flex items-center px-2 py-1 border border-[#56ce84] rounded-sm text-sm text-[#56ce84]"
            classMenuItems="mt-2 w-[180px] flex"
            items={filterItems.map((item) => ({
              label: item.label,
              onClick: () => handleFilterSelect(item.value),
            }))}
            
            
          />
        </div>
      </div>

      {/* Advertisments */}
      <Card>
      <div className="mt-2 border-t-1 border-gray-200">
        <h3 className='text-sm font-semibold text-red-500'>Advertisments: (Max 3 Running)</h3>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
                <th className="sm:px-6 px-2 sm:py-3 py-2">Topic Name</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">Marketing Type</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">CTA</th>
                {/* <th className="sm:px-6 px-2 sm:py-3 py-2">Total Viewers</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">Total Reviews</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">Avg. Time</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">Total Time</th> */}
              </tr>
            </thead>
            <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
              <tr className="text-left sm:text-sm text-xs font-normal text-gray-500">
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Facebook Ads</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Social Media</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Shop Now</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-blue-500 ">Performance</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-green-500 ">Modify</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-orange-500 ">Archeive</td>
              </tr>
              <tr className="text-left sm:text-sm text-xs font-normal text-gray-500">
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Email Campaign</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Email Marketing</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Sign Up</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-blue-500 ">Performance</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-green-500 ">Modify</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-orange-500 ">Archeive</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </Card>

      {/* News */}
      <Card className='mt-2'>
      <div className="mt-2 border-t-1 border-gray-200">
        <h3 className='text-sm font-semibold text-red-500'>News: (Max 3 Running)</h3>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
                <th className="sm:px-6 px-2 sm:py-3 py-2">Topic Name</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">Marketing Type</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">CTA</th>
              </tr>
            </thead>
            <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
              <tr className="text-left sm:text-sm text-xs font-normal text-gray-500">
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Facebook Ads</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Social Media</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Shop Now</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-green-500 ">Modify</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-orange-500 ">Archeive</td>
              </tr>
              <tr className="text-left sm:text-sm text-xs font-normal text-gray-500">
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Email Campaign</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Email Marketing</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Sign Up</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-green-500 ">Modify</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-orange-500 ">Archeive</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </Card>

      {/* Health Tips */}
      <Card className='mt-2'>
      <div className="mt-2 border-t-1 border-gray-200">
        <h3 className='text-sm font-semibold text-red-500'>Health Tips: (Max 3 Running)</h3>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
                <th className="sm:px-6 px-2 sm:py-3 py-2">Topic Name</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">Media Type</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">CTA</th>
              </tr>
            </thead>
            <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
              <tr className="text-left sm:text-sm text-xs font-normal text-gray-500">
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Facebook Ads</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Photo</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Shop Now</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-green-500 ">Modify</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-orange-500 ">Archeive</td>
              </tr>
              <tr className="text-left sm:text-sm text-xs font-normal text-gray-500">
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Email Campaign</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Video</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Sign Up</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-green-500 ">Modify</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-orange-500 ">Archeive</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </Card>

      {/* Events */}
      <Card className='mt-2'>
      <div className="mt-2 border-t-1 border-gray-200">
        <h3 className='text-sm font-semibold text-red-500'>Events: (Max 3 Running)</h3>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
                <th className="sm:px-6 px-2 sm:py-3 py-2">Topic Name</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">Media Type</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">CTA</th>
              </tr>
            </thead>
            <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
              <tr className="text-left sm:text-sm text-xs font-normal text-gray-500">
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Facebook Ads</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Photo</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Shop Now</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-green-500 ">Modify</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-orange-500 ">Archeive</td>
              </tr>
              <tr className="text-left sm:text-sm text-xs font-normal text-gray-500">
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Email Campaign</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Video</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Sign Up</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-green-500 ">Modify</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-orange-500 ">Archeive</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </Card>
      
      {/* Scheduled Activities */}
      <Card className='mt-2'>
      <div className="mt-2 border-t-1 border-gray-200">
        <h3 className='text-sm font-semibold text-red-500'>Scheduled</h3>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
                <th className="sm:px-6 px-2 sm:py-3 py-2">Topic Name</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">Media Type</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">CTA</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">Marketing Type</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">Scheduled Date/ Time</th>
              </tr>
            </thead>
            <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
              <tr className="text-left sm:text-sm text-xs font-normal text-gray-500">
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Facebook Ads</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Social Media</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Shop Now</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Social Media</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">2024-02-1 12:00</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-green-500 ">Modify</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-red-500 ">Delete</td>
              </tr>
              <tr className="text-left sm:text-sm text-xs font-normal text-gray-500">
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Email Campaign</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Email Marketing</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Sign Up</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Email Marketing</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">2024-02-1 12:00</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-green-500 ">Modify</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-red-500 ">Delete</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </Card>

      {/* Archeive */}
      <Card className='mt-2'>
      <div className="mt-2 border-t-1 border-gray-200">
        <h3 className='text-sm font-semibold text-red-500'>Archeive</h3>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
                <th className="sm:px-6 px-2 sm:py-3 py-2">Topic Name</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">Media Type</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">CTA</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">Marketing Type</th>
              </tr>
            </thead>
            <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
              <tr className="text-left sm:text-sm text-xs font-normal text-gray-500">
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Facebook Ads</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Social Media</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Shop Now</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Social Media</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2  font-semibold border text-center cursor-pointer text-yellow-500">Re Publish</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-green-500 ">Modify</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-red-500 ">Delete</td>
              </tr>
              <tr className="text-left sm:text-sm text-xs font-normal text-gray-500">
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Email Campaign</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Email Marketing</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Sign Up</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Email Marketing</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2  font-semibold border text-center cursor-pointer text-yellow-500">Re Publish</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-green-500 ">Modify</td>
                <td className="sm:px-6 px-2 sm:py-3 py-2 font-semibold border text-center cursor-pointer text-red-500 ">Delete</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </Card>

    </div>
  );
}
