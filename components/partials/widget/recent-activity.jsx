const activity = [
  {
    id: 1,
    img: "/assets/images/users/user-1.jpg",
  },
  {
    id: 2,
    img: "/assets/images/users/user-2.jpg",
  },
  {
    id: 3,
    img: "/assets/images/users/user-3.jpg",
  },
  {
    id: 4,
    img: "/assets/images/users/user-4.jpg",
  },
  {
    id: 5,
    img: "/assets/images/users/user-5.jpg",
  },
  {
    id: 6,
    img: "/assets/images/users/user-6.jpg",
  },

];

import Icon from "@/components/ui/Icon";

const RecentActivity = () => {
  return (
    <div>
      <ul className="list-item space-y-3 h-full overflow-x-auto">
        {activity.map((item, i) => (
          <li
            className="flex justify-between items-center space-x-3 rtl:space-x-reverse border-b border-slate-100 dark:border-slate-700 last:border-b-0 pb-3 last:pb-0"
            key={i}
          >
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-[100%]">
                <img
                  src={item.img}
                  alt=""
                  className="w-full h-full rounded-[100%] object-cover"
                />
              </div>
            <div className="text-start overflow-hidden text-ellipsis whitespace-nowrap max-w-[63%] ml-4">
              <div className="text-sm text-slate-600 dark:text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap">
                Dr. Jaylon Stanton
              </div>
            </div>
            </div>
            <div className="flex justify-end items-end">
              <div className="text-sm font-light text-slate-400 dark:text-slate-400">
                {/* 1 hours */}
               <Icon icon="solar:menu-dots-bold" className="w-6 h-6" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentActivity;
