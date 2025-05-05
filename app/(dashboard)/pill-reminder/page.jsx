"use client";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const pillReminder = () => {
  return (
    <Card className="min-h-[80vh] bg-white">
      <div className="flex max-lg:flex-col pb-6 items-center w-full">
        <h6 className="md:mb-0 mb-3 w-full">Pills Reminder</h6>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
              <th className="px-4 py-3">Full Name</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Medication name</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3">Medication Type</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="cursor-pointer hover:bg-gray-50">
              <td className="px-4 py-2 capitalize">ibrahim Rao</td>
              <td className="px-4 py-2 capitalize">5-5-2025</td>
              <td className="px-4 py-2 capitalize">Cosmelon</td>
              <td className="px-4 py-2 capitalize">Critical</td>
              <td className="px-4 py-2 capitalize">Antibiotic</td>
              <td className="px-4 py-2">
                <div className="flex space-x-2">
                  <Button
                    icon="lets-icons:eye"
                    iconClass="text-blue-500 text-lg"
                    className="p-0 bg-transparent border-none"
                  />
                  <Button
                    icon="material-symbols:download"
                    iconClass="text-red-500 text-lg"
                    className="p-0 bg-transparent border-none"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default pillReminder;
