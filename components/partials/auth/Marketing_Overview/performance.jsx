import React from 'react'
import Card from '@/components/ui/Card'
import GroupChart2 from '../../widget/chart/group-chart-2'

export default function Performance() {
  return (
    <div>
      <p className='text-[#56ce84] font-semibold max-sm:text-sm'>Running</p>

      {/* tabular form */}
      <div className='mt-2 border-t-1 border-gray-200'>
      <div className="overflow-x-auto  custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
              {/* <div> */}
              <th className="sm:px-6 px-2 sm:py-3 py-2">Topic Name</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Marketing Type</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">CTA</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Total Viewers</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Total Reviews</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Avg. Time</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Total Time</th>
            </tr>
          </thead>
          <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
          <tr className="text-left sm:text-sm text-xs font-normal text-gray-500">
              {/* <div> */}
              <th className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Facebook Ads</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Social Media</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Shop Now</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2 font-normal">3,500</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2 font-normal">900</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2 font-normal">1m 45s</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2 font-normal">102h</th>
            </tr>

          <tr className="text-left sm:text-sm text-xs font-normal text-gray-500">
              {/* <div> */}
              <th className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Email Campaign</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Email Marketing</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2 font-normal">Sign Up</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2 font-normal">1,200</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2 font-normal">1,200</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2 font-normal">3m 55s</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2 font-normal">82h</th>
            </tr>
            {/* {filteredData.map((item) => (
              
              <tr key={item.id} onClick={() => handleView(item.id)} className="cursor-pointer">
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                {item.facility_type?.join(", ") || "Null"}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.facility_name || "Null"}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.contact_num || "Null"}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.whatsapp || "Null"}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.gps_address || "Null"}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.street || "Null"}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.post_code || "Null"}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.area || "Null"}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.district || "Null"}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.region || "Null"}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.country || "Null"}
                </td>
               
                <td className={`sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap`}>
                  {item.status === "Active" ? (
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="">Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="">In Active</span>
                    </div>
                  )}
                </td>
              
              </tr>
            ))} */}
          </tbody>
        </table>
      </div>
      </div>

      {/* total */}
      <p className='text-[#56ce84] font-semibold max-sm:text-sm mt-5'>Total</p>
      <div className="grid grid-cols-12 gap-5 mb-5 max-sm:mt-2">
        {/* <div className="2xl:col-span-3 lg:col-span-4 col-span-12">
            <ImageBlock1 />
          </div> */}
        <div className="2xl:col-span-12 lg:col-span-12 col-span-12">
          <Card bodyClass="sm:p-4">
            <div className="grid lg:grid-cols-4 md:grid-cols-2 col-span-1 gap-4">
              <GroupChart2 />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
