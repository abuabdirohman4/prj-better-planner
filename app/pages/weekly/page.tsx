"use client";
import InputChecbox from "@/components/Input/InputCheckbox/page";
import { Week } from "@/types";
import { SESSIONKEY } from "@/utils/constants";
import { getSession } from "@/utils/session";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Image from "next/image";
import { useEffect, useState } from "react";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";

export default function Weekly() {
  const [currentWeek, setCurrentWeek] = useState<{
    id: number;
    week: number;
    startDate: string;
    endDate: string;
  }>();
  const [weeks, setWeeks] = useState<Week[]>();

  const handleChangeWeek = (direction: "Back" | "Forward") => {
    if (currentWeek) {
      let tempCurrentWeek = currentWeek?.week;
      if (direction === "Back") {
        tempCurrentWeek = currentWeek?.week - 1;
        if (tempCurrentWeek < 1) {
          tempCurrentWeek = 13;
        }
      } else if (direction === "Forward") {
        tempCurrentWeek = currentWeek?.week + 1;
        if (tempCurrentWeek > 13) {
          tempCurrentWeek = 1;
        }
      }
      const selectedWeek = weeks?.find((item) => item.week == tempCurrentWeek);
      if (selectedWeek) {
        setCurrentWeek({
          id: selectedWeek.id,
          week: selectedWeek.week,
          startDate: format(selectedWeek.startDate, "d MMMM yyyy", {
            locale: id,
          }),
          endDate: format(selectedWeek.endDate, "d MMMM yyyy", {
            locale: id,
          }),
        });
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const weeksActive = getSession(SESSIONKEY.weeksActive);
      const weekActive = getSession(SESSIONKEY.weekActive);
      if (weeksActive && weekActive) {
        setWeeks(weeksActive);
        setCurrentWeek({
          id: weekActive.id,
          week: weekActive.week,
          startDate: format(weekActive.startDate, "d MMMM yyyy", {
            locale: id,
          }),
          endDate: format(weekActive.endDate, "d MMMM yyyy", {
            locale: id,
          }),
        });
      }
    };
    fetchData();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <div className="absolute right-10 mt-3 flex gap-2">
          <div className="text-2xl font-semibold mt-1 me-2">
            Minggu {currentWeek?.week}
          </div>
          <div className="flex gap-4">
            <button className="bg-white px-4 py-2 rounded-md border border-gray-200 hover:cursor-pointer hover:bg-gray-100">
              <IoIosArrowBack
                className="text-2xl"
                onClick={() => handleChangeWeek("Back")}
              />
            </button>
            <button className="bg-white px-4 py-2 rounded-md border border-gray-200 hover:cursor-pointer hover:bg-gray-100">
              <IoIosArrowForward
                className="text-2xl"
                onClick={() => handleChangeWeek("Forward")}
              />
            </button>
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black">WEEKLY SYNC</h1>
          <div className="flex justify-center mt-2">
            <Image
              width={150}
              height={150}
              src="/title.svg"
              alt="title"
              priority
            />
          </div>
        </div>
      </div>

      <div>
        <InputChecbox label="Review High Focus Goal" />
        <InputChecbox label="Review S.D.C" />
        <InputChecbox label="Spiritual" />
      </div>

      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold text-black">
          3 Goal Minggu {currentWeek?.week}
        </h1>
        <div className="flex justify-center mt-2">
          <Image
            width={150}
            height={150}
            src="/title.svg"
            alt="title"
            priority
          />
        </div>
      </div>
      <div>
        <div>MULAI : {currentWeek?.startDate}</div>
        <div>AKHIR : {currentWeek?.endDate}</div>
      </div>

      {/* <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold text-black">{`To Don't List`}</h1>
        <div className="flex justify-center mt-2">
          <Image
            width={150}
            height={150}
            src="/title.svg"
            alt="title"
            priority
          />
        </div>
      </div> */}
    </div>
  );
}
