import React, { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import GroupChart2 from "../../widget/chart/group-chart-2";
import Icons from "@/components/ui/Icon";
import Dropdown from "@/components/ui/Dropdown"; // Import the Dropdown component
import { getBannersAds } from "@/app/services/banners_ads";
import { Icon } from "@iconify/react";
import Button from "@/components/ui/Button";
import Loading from "@/app/loading";
import moment from "moment";

export default function Activity() {
  const [filter, setFilter] = useState("");
  const [adsData, setAdsData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [healthData, setHealthData] = useState([]);
  const [eventsData, setEventsData] = useState([]);
  const [archiveData, setArchiveData] = useState([]);
  const [scheduledData, setScheduledData] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFilterSelect = (value) => {
    setFilter(value);
    // Handle filter logic here based on selected value
    console.log("Selected Filter:", value);
  };

  const filterItems = [
    { label: "Ads Display Order", value: "ads-display-order" },
    { label: "Advertisement", value: "advertisement" },
    { label: "News", value: "news" },
    { label: "Health", value: "health" },
    { label: "Events", value: "events" },
    { label: "Auto Slide Delay (seconds)", value: "auto-slide-delay" },
  ];

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await getBannersAds().finally(() => setLoading(false));
      console.log(data);
      setAdsData(data.adsData);
      setNewsData(data.newsData);
      setHealthData(data.healthData);
      setEventsData(data.eventsData);
      setArchiveData(data.archiveData);
      setScheduledData(data.scheduledData);
    })();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center">
        <p className="text-[#56ce84] font-semibold max-sm:text-sm">Running</p>
        <div className="flex items-center">
          <p className="flex items-center text-[#56ce84] font-semibold"></p>
          <Dropdown
            label={
              <>
                <Icons icon={"hugeicons:filter"} /> Filter{" "}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            }
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
      <Card bodyClass="max-sm:p-2">
        <div className="mt-2 border-t-1 border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-red-500">
            Advertisements: (Max 3 Running)
          </h3>
          {loading ? (
            <div className="flex w-full justify-center items-center p-4">
              <AcitivityIndicator />
            </div>
          ) : adsData.length > 0 && !loading ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
                    <th className="sm:px-6 px-2 sm:py-3 py-2">Headline</th>
                    <th className="sm:px-6 px-2 sm:py-3 py-2">Media Type</th>
                    <th className="sm:px-6 px-2 sm:py-3 py-2">CTA</th>
                    {/* <th className="sm:px-6 px-2 sm:py-3 py-2">Total Viewers</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">Total Reviews</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">Avg. Time</th>
                <th className="sm:px-6 px-2 sm:py-3 py-2">Total Time</th> */}
                  </tr>
                </thead>
                <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
                  {adsData &&
                    adsData.map((item, index) => (
                      <tr
                        key={index}
                        className="text-left sm:text-sm text-xs font-normal text-gray-500"
                      >
                        <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                          {item.headline[0]}
                        </td>
                        <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                          {item.mediaType === "video" ? "Video" : "Image"}
                        </td>
                        <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                          {item.callToAction}
                        </td>
                        <td className="  sm:py-3 py-2 font-semibold border text-center cursor-pointer">
                          <Button
                            icon="ic:baseline-query-stats"
                            iconClass="text-blue-500 text-2xl"
                            className="p-0 bg-transparent border-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item.id);
                            }}
                          />
                        </td>
                        <td className="  sm:py-3 py-2 font-semibold border text-center cursor-pointer">
                          <Button
                            icon="heroicons-outline:pencil-alt"
                            iconClass="text-green-500 text-2xl"
                            className="p-0 bg-transparent border-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item.id);
                            }}
                          />
                        </td>
                        <td className="  sm:py-3 py-2 font-semibold border text-center cursor-pointer">
                          <Button
                            icon="material-symbols:archive"
                            iconClass="text-[#fd9500] text-2xl"
                            className="p-0 bg-transparent border-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item.id);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex w-full justify-start items-center p-4">
              <p>No Ads Currently Active</p>
            </div>
          )}
        </div>
      </Card>

      {/* News */}
      <Card bodyClass="max-sm:p-2" className="mt-2">
        <div className="mt-2 border-t-1 border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-red-500">
            News: (Max 3 Running)
          </h3>
          {loading ? (
            <div className="flex w-full justify-center items-center p-4">
              <AcitivityIndicator />
            </div>
          ) : newsData.length > 0 ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
                    <th className="sm:px-6 px-2 sm:py-3 py-2">Headline</th>
                    <th className="sm:px-6 px-2 sm:py-3 py-2">Media Type</th>
                    <th className="sm:px-6 px-2 sm:py-3 py-2">CTA</th>
                  </tr>
                </thead>
                <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
                  {newsData &&
                    newsData.map((item, index) => (
                      <tr
                        key={index}
                        className="text-left sm:text-sm text-xs font-normal text-gray-500"
                      >
                        <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                          {item.headline[0]}
                        </td>
                        <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                          {item.mediaType === "video" ? "Video" : "Image"}
                        </td>
                        <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                          {item.callToAction}
                        </td>
                        <td className="  sm:py-3 py-2 font-semibold border text-center cursor-pointer">
                          <Button
                            icon="ic:baseline-query-stats"
                            iconClass="text-blue-500 text-2xl"
                            className="p-0 bg-transparent border-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item.id);
                            }}
                          />
                        </td>
                        <td className="  sm:py-3 py-2 font-semibold border text-center cursor-pointer">
                          <Button
                            icon="heroicons-outline:pencil-alt"
                            iconClass="text-green-500 text-2xl"
                            className="p-0 bg-transparent border-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item.id);
                            }}
                          />
                        </td>
                        <td className="  sm:py-3 py-2 font-semibold border text-center cursor-pointer">
                          <Button
                            icon="material-symbols:archive"
                            iconClass="text-[#fd9500] text-2xl"
                            className="p-0 bg-transparent border-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item.id);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex w-full justify-start items-center p-4">
              <p>No News Ads Currently Active</p>
            </div>
          )}
        </div>
      </Card>

      {/* Health Tips */}
      <Card bodyClass="max-sm:p-2" className="mt-2">
        <div className="mt-2 border-t-1 border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-red-500">
            Health Tips: (Max 3 Running)
          </h3>
          {loading ? (
            <div className="flex w-full justify-center items-center p-4">
              <AcitivityIndicator />
            </div>
          ) : healthData.length > 0 ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
                    <th className="sm:px-6 px-2 sm:py-3 py-2">Headline</th>
                    <th className="sm:px-6 px-2 sm:py-3 py-2">Media Type</th>
                    <th className="sm:px-6 px-2 sm:py-3 py-2">CTA</th>
                  </tr>
                </thead>
                <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
                  {healthData &&
                    healthData.map((item, index) => (
                      <tr
                        key={index}
                        className="text-left sm:text-sm text-xs font-normal text-gray-500"
                      >
                        <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                          {item.headline[0]}
                        </td>
                        <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                          {item.mediaType === "video" ? "Video" : "Image"}
                        </td>
                        <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                          {item.callToAction}
                        </td>
                        <td className="  sm:py-3 py-2 font-semibold border text-center cursor-pointer">
                          <Button
                            icon="ic:baseline-query-stats"
                            iconClass="text-blue-500 text-2xl"
                            className="p-0 bg-transparent border-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item.id);
                            }}
                          />
                        </td>
                        <td className="  sm:py-3 py-2 font-semibold border text-center cursor-pointer">
                          <Button
                            icon="heroicons-outline:pencil-alt"
                            iconClass="text-green-500 text-2xl"
                            className="p-0 bg-transparent border-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item.id);
                            }}
                          />
                        </td>
                        <td className="  sm:py-3 py-2 font-semibold border text-center cursor-pointer">
                          <Button
                            icon="material-symbols:archive"
                            iconClass="text-[#fd9500] text-2xl"
                            className="p-0 bg-transparent border-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item.id);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex w-full justify-start items-center p-4">
              <p>No Health Tips Currently Active</p>
            </div>
          )}
        </div>
      </Card>

      {/* Events */}
      <Card bodyClass="max-sm:p-2" className="mt-2">
        <div className="mt-2 border-t-1 border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-red-500">
            Events: (Max 3 Running)
          </h3>
          {loading ? (
            <div className="flex w-full justify-center items-center p-4">
              <AcitivityIndicator />
            </div>
          ) : eventsData.length > 0 ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
                    <th className="sm:px-6 px-2 sm:py-3 py-2">Headline</th>
                    <th className="sm:px-6 px-2 sm:py-3 py-2">Media Type</th>
                    <th className="sm:px-6 px-2 sm:py-3 py-2">CTA</th>
                  </tr>
                </thead>
                <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
                  {eventsData &&
                    eventsData.map((item, index) => (
                      <tr
                        key={index}
                        className="text-left sm:text-sm text-xs font-normal text-gray-500"
                      >
                        <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                          {item.headline[0]}
                        </td>
                        <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                          {item.mediaType === "video" ? "Video" : "Image"}
                        </td>
                        <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                          {item.callToAction}
                        </td>
                        <td className="  sm:py-3 py-2 font-semibold border text-center cursor-pointer">
                          <Button
                            icon="ic:baseline-query-stats"
                            iconClass="text-blue-500 text-2xl"
                            className="p-0 bg-transparent border-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item.id);
                            }}
                          />
                        </td>
                        <td className="  sm:py-3 py-2 font-semibold border text-center cursor-pointer">
                          <Button
                            icon="heroicons-outline:pencil-alt"
                            iconClass="text-green-500 text-2xl"
                            className="p-0 bg-transparent border-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item.id);
                            }}
                          />
                        </td>
                        <td className="  sm:py-3 py-2 font-semibold border text-center cursor-pointer">
                          <Button
                            icon="material-symbols:archive"
                            iconClass="text-[#fd9500] text-2xl"
                            className="p-0 bg-transparent border-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item.id);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex w-full justify-start items-center p-4">
              <p>No Events Currently Active</p>
            </div>
          )}
        </div>
      </Card>

      {/* Scheduled Activities */}
      <Card bodyClass="max-sm:p-2" className="mt-2">
        <div className="mt-2 border-t-1 border-gray-200 p-5">
          <p className="text-[#00a6ff] font-semibold max-sm:text-sm">
            Scheduled
          </p>
          {loading ? (
            <div className="flex w-full justify-center items-center p-4">
              <AcitivityIndicator />
            </div>
          ) : scheduledData.length > 0 ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
                    <th className="sm:px-6 px-2 sm:py-3 py-2">Headline</th>
                    <th className="sm:px-6 px-2 sm:py-3 py-2">Banner Type</th>
                    <th className="sm:px-6 px-2 sm:py-3 py-2">Media Type</th>
                    <th className="sm:px-6 px-2 sm:py-3 py-2">CTA</th>
                    <th className="sm:px-6 px-2 sm:py-3 py-2">
                      Scheduled Date/ Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
                  {scheduledData &&
                    scheduledData.map((item, index) => (
                      <tr
                        key={index}
                        className="text-left sm:text-sm text-xs font-normal text-gray-500"
                      >
                        <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                          {item.headline[0]}
                        </td>
                        <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                          {item.bannerType}
                        </td>
                        <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                          {item.mediaType === "video" ? "Video" : "Image"}
                        </td>
                        <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                          {item.callToAction}
                        </td>
                        <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                          {moment(item.starting_date_and_time).format(
                            "DD/MM/YYYY hh:mm A"
                          )}
                        </td>
                        <td className="  sm:py-3 py-2 font-semibold border text-center cursor-pointer">
                          <Button
                            icon="ic:baseline-query-stats"
                            iconClass="text-blue-500 text-2xl"
                            className="p-0 bg-transparent border-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item.id);
                            }}
                          />
                        </td>
                        <td className="  sm:py-3 py-2 font-semibold border text-center cursor-pointer">
                          <Button
                            icon="heroicons-outline:pencil-alt"
                            iconClass="text-green-500 text-2xl"
                            className="p-0 bg-transparent border-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item.id);
                            }}
                          />
                        </td>
                        <td className="  sm:py-3 py-2 font-semibold border text-center cursor-pointer">
                          <Button
                            icon="material-symbols:archive"
                            iconClass="text-[#fd9500] text-2xl"
                            className="p-0 bg-transparent border-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item.id);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex w-full justify-start items-center p-4">
              <p>No Scheduled Activities</p>
            </div>
          )}
        </div>
      </Card>

      {/* Archive */}
      <Card bodyClass="max-sm:p-2" className="mt-2">
        <div className="mt-2 border-t-1 border-gray-200 p-5">
          <p className="text-[#ffa200] font-semibold max-sm:text-sm">
            Archived
          </p>
          {loading ? (
            <div className="flex w-full justify-center items-center p-4">
              <AcitivityIndicator />
            </div>
          ) : (
            archiveData &&
            archiveData.map((item, index) => (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
                      <th className="sm:px-6 px-2 sm:py-3 py-2">Headline</th>
                      <th className="sm:px-6 px-2 sm:py-3 py-2">Banner Type</th>
                      <th className="sm:px-6 px-2 sm:py-3 py-2">Media Type</th>
                      <th className="sm:px-6 px-2 sm:py-3 py-2">CTA</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
                    <tr
                      key={index}
                      className="text-left sm:text-sm text-xs font-normal text-gray-500"
                    >
                      <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                        {item.headline.join(", ")}
                      </td>
                      <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                        {item.bannerType}
                      </td>
                      <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                        {item.mediaType === "video" ? "Video" : "Image"}
                      </td>
                      <td className="sm:px-6 px-2 sm:py-3 py-2 font-normal">
                        {item.callToAction}
                      </td>
                      <td className="  sm:py-3 py-2 font-semibold border text-center cursor-pointer">
                        <Button
                          icon="ic:baseline-query-stats"
                          iconClass="text-blue-500 text-2xl"
                          className="p-0 bg-transparent border-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(item.id);
                          }}
                        />
                      </td>
                      <td className="  sm:py-3 py-2 font-semibold border text-center cursor-pointer">
                        <Button
                          icon="heroicons-outline:pencil-alt"
                          iconClass="text-green-500 text-2xl"
                          className="p-0 bg-transparent border-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(item.id);
                          }}
                        />
                      </td>
                      <td className="  sm:py-3 py-2 font-semibold border text-center cursor-pointer">
                        <Button
                          icon="material-symbols:unarchive"
                          iconClass="text-[#0078fd] text-2xl"
                          className="p-0 bg-transparent border-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(item.id);
                          }}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

export const AcitivityIndicator = () => {
  return (
    <svg
      className="animate-spin ltr:-ml-1 ltr:mr-3 rtl:-mr-1 rtl:ml-3
       h-7 w-7
     "
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
};
