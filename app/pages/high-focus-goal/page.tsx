"use client";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import BulletPointItem from "./item";
import { BulletPoint } from "@/types";
import debounce from "lodash/debounce";
import axios from "axios";

export default function HighFocusGoal() {
  const [bulletPoints, setBulletPoints] = useState<BulletPoint[]>([]);
  const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const activeInputIndex = useRef<number | null>(null);
  const cursorPosition = useRef<number | null>(null);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchBulletPoints();
  }, []);

  const fetchBulletPoints = async () => {
    const response = await fetch("/api/bulletPoints");
    const data = await response.json();
    setBulletPoints(data);
  };

  const addBulletPoint = async (index: number) => {
    const newIndent = index >= 0 ? bulletPoints[index].indent : 0;
    const newOrder =
      bulletPoints.length > 0
        ? bulletPoints[bulletPoints.length - 1].order + 1
        : 0;
    const newBulletPoint = { text: "", indent: newIndent, order: newOrder };
    const response = await fetch("/api/bulletPoints", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newBulletPoint),
    });
    const data = await response.json();
    const updatedBulletPoints = [
      ...bulletPoints.slice(0, index + 1),
      data,
      ...bulletPoints.slice(index + 1),
    ];
    setBulletPoints(updatedBulletPoints);
    activeInputIndex.current = index + 1;
    cursorPosition.current = 0; // Reset cursor position
  };

  const handleDelete = async (taskId: number, index: number) => {
    await axios.delete(`/api/bulletPoints/${taskId}`);
    fetchBulletPoints();
    if (index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const updateBulletPoint = async (bulletPoint: BulletPoint) => {
    const taskId = bulletPoint.id;
    if (taskId) {
      await fetch(`/api/bulletPoints/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bulletPoint),
      });
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdateBulletPoint = useCallback(
    debounce(updateBulletPoint, 500),
    [updateBulletPoint]
  );
  // const debounceUpdateBulletPoint = useCallback(
  //   debounce((bulletPoint) => updateBulletPoint(bulletPoint), 500),
  //   []
  // );

  const handleInputChange = (index: number, value: string) => {
    const newBulletPoints = [...bulletPoints];
    newBulletPoints[index].text = value;
    setBulletPoints(newBulletPoints);

    activeInputIndex.current = index;
    cursorPosition.current = inputRefs.current[index]?.selectionStart || null;
    debouncedUpdateBulletPoint(newBulletPoints[index]);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addBulletPoint(index);
    } else if (
      (e.key === "Backspace" || e.key === "Delete") &&
      bulletPoints[index].text.trim() === ""
    ) {
      e.preventDefault();
      handleDelete(Number(bulletPoints[index].id), index);
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      if (
        bulletPoints[index].indent <
        (bulletPoints[index - 1]?.indent ?? 0) + 1
      ) {
        changeIndent(index, bulletPoints[index].indent + 1);
      }
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      if (bulletPoints[index].indent > 0) {
        changeIndent(index, bulletPoints[index].indent - 1);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (index > 0) {
        activeInputIndex.current = index - 1;
        cursorPosition.current = 0; // Reset cursor to start
        inputRefs.current[index - 1]?.focus();
        inputRefs.current[index - 1]?.setSelectionRange(0, 0); // Set cursor position to start
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (index < bulletPoints.length - 1) {
        activeInputIndex.current = index + 1;
        cursorPosition.current = 0; // Reset cursor to start
        inputRefs.current[index + 1]?.focus();
        inputRefs.current[index + 1]?.setSelectionRange(0, 0); // Set cursor position to start
      }
    }
  };

  const changeIndent = async (index: number, newIndent: number) => {
    cursorPosition.current = inputRefs.current[index]?.selectionStart || null;
    const newBulletPoints = [...bulletPoints];
    newBulletPoints[index].indent = newIndent;
    setBulletPoints(newBulletPoints);

    const taskId = newBulletPoints[index].id;
    if (taskId) {
      await fetch(`/api/bulletPoints/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newBulletPoints[index]),
      });
    }

    activeInputIndex.current = index;
  };

  const moveBulletPoint = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const dragBulletPoint = bulletPoints[dragIndex];
      const draggedChildren = [];
      for (let i = dragIndex + 1; i < bulletPoints.length; i++) {
        if (bulletPoints[i].indent > dragBulletPoint.indent) {
          draggedChildren.push(bulletPoints[i]);
        } else {
          break;
        }
      }

      const newBulletPoints = [...bulletPoints];
      newBulletPoints.splice(dragIndex, draggedChildren.length + 1);

      newBulletPoints.splice(
        hoverIndex,
        0,
        dragBulletPoint,
        ...draggedChildren
      );

      // Update the order field
      const reorderedBulletPoints = newBulletPoints.map(
        (bulletPoint, index) => ({
          ...bulletPoint,
          order: index,
        })
      );

      setBulletPoints(reorderedBulletPoints);

      for (const bulletPoint of reorderedBulletPoints) {
        if (bulletPoint.id) {
          fetch(`/api/bulletPoints/${bulletPoint.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(bulletPoint),
          });
        }
      }

      activeInputIndex.current = hoverIndex;
      setDragIndex(null);
      setHoverIndex(null);
    },
    [bulletPoints]
  );

  useEffect(() => {
    if (activeInputIndex.current !== null) {
      const input = inputRefs.current[activeInputIndex.current];
      if (input) {
        input.focus();
        if (cursorPosition.current !== null) {
          input.setSelectionRange(
            cursorPosition.current,
            cursorPosition.current
          );
        }
      }
    }
  }, [bulletPoints]);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const index = inputRefs.current.findIndex((input) => input === e.target);
      if (index !== -1) {
        activeInputIndex.current = index;
      }
    };

    const inputs = inputRefs.current;
    inputs.forEach((input) => {
      input?.addEventListener("focus", handleFocus);
    });

    return () => {
      inputs.forEach((input) => {
        input?.removeEventListener("focus", handleFocus);
      });
    };
  }, [bulletPoints]);

  const Milestone = () => {
    return (
      <div className="mb-2 ml-1.5 flex items-start items-center cursor-pointer">
        <div className="relative group bg-white">
          <div className="w-2 h-2 bg-black rounded-full"></div>
          <div className="absolute -left-1.5 -top-1.5 inset-0 w-5 h-5 rounded-full border-[6px] border-transparent group-hover:border-gray-300 transition-all duration-300 ease-in-out"></div>
        </div>
        <textarea
          placeholder="Add new task"
          // value={bulletPoint.text}
          // onChange={(e) => handleInputChange(index, e.target.value)}
          rows={1}
          className="block pl-3 w-full text-gray-900 bg-transparent resize-none appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
        />
      </div>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4 text-black">High Focus Goal</h1>
        <p className="mb-2">
          3 Milestone (Goal Kecil) untuk mewujudkan High Focus Goal :
        </p>
        <Milestone />
        <Milestone />
        <Milestone />
        <p className="mb-2">Langkah selanjutnya untuk mencapai Milestone 1 :</p>
        <Milestone />
        <Milestone />
        <Milestone />
        <p className="mb-2">Langkah selanjutnya untuk mencapai Milestone 2 :</p>
        <Milestone />
        <Milestone />
        <Milestone />
        <p className="mb-2">Langkah selanjutnya untuk mencapai Milestone 3 :</p>
        <Milestone />
        <Milestone />
        <Milestone />
        {bulletPoints.map((bulletPoint, index) => (
          <BulletPointItem
            key={bulletPoint.id}
            bulletPoint={bulletPoint}
            index={index}
            moveBulletPoint={moveBulletPoint}
            inputRefs={inputRefs}
            handleInputChange={handleInputChange}
            handleKeyDown={handleKeyDown}
            setHoverIndex={setHoverIndex}
            hoverIndex={hoverIndex}
            setDragIndex={setDragIndex}
            dragIndex={dragIndex}
          />
        ))}
        <div className="flex py-2">
          <FontAwesomeIcon
            icon={faPlus}
            className="hover:bg-gray-300 rounded-full w-3 h-3 p-1 pt-1.5"
            onClick={() => addBulletPoint(bulletPoints.length - 1)}
          />
        </div>
      </div>
    </DndProvider>
  );
}
