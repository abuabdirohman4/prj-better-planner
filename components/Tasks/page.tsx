"use client";
import { HighFocusGoal, Task } from "@/types";
import { deleteData, postData, putData } from "@/utils/apiClient";
import { SESSIONKEY } from "@/utils/constants";
import { getSession } from "@/utils/session";
import axios from "axios";
import debounce from "lodash/debounce";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import TaskItem from "./item";

export interface Props<T> {
  type: "12WG" | "HFG" | "SDC" | "WG" | "TDL" | "DF" | "TL" | "12WS";
  sourceTasks: T[];
  allowIndent?: boolean;
  endpoint: string;
  orderType?: "bullet" | "number" | "alphabet";
}

function isHighFocusGoal(task: any): task is HighFocusGoal {
  return (task as HighFocusGoal) ? true : false;
}

export default function Tasks<T extends Task>({
  type,
  sourceTasks,
  endpoint,
  allowIndent = true,
  orderType = "bullet",
}: Props<T>) {
  const [tasks, setTasks] = useState<T[]>(sourceTasks);
  const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const activeInputIndex = useRef<number | null>(null);
  const cursorPosition = useRef<number | null>(null);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const fetchTasks = useCallback(async () => {
    setTasks(sourceTasks);
  }, [sourceTasks]);

  const addTask = async (index: number) => {
    const newIndent = index >= 0 ? tasks[index].indent : 0;
    const newOrder =
      tasks.length > 0 ? (tasks[tasks.length - 1].order ?? 0) + 1 : 0;
    const newTask = { text: "", indent: newIndent, order: newOrder };
    const response = await fetch(`/api/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newTask),
    });
    const data = await response.json();
    const updatedTasks = [
      ...tasks.slice(0, index + 1),
      data,
      ...tasks.slice(index + 1),
    ];
    setTasks(updatedTasks);
    activeInputIndex.current = index + 1;
    cursorPosition.current = 0; // Reset cursor position
  };

  const handleDelete = async (taskId: number) => {
    try {
      await deleteData({
        url: `/${endpoint}/${taskId}`,
        data: { periodName: getSession(SESSIONKEY.periodActive) },
      });
      fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      throw new Error("Failed to delete task");
    }
  };

  const updateTask = useCallback(
    async (payload: T) => {
      if (payload.id) {
        try {
          return await putData({
            url: `/${endpoint}/${payload.id}`,
            payload,
          });
        } catch (error) {
          console.error("Error updating task:", error);
          throw new Error("Failed to update task");
        }
      }
    },
    [endpoint]
  );

  const insertTask = async (payload: T, index: number) => {
    try {
      const res = await postData({
        url: `/${endpoint}`,
        payload,
      });
    } catch (error) {
      console.error("Error updating task:", error);
      throw new Error("Failed to update task");
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdateTask = useCallback(debounce(updateTask, 500), [
    updateTask,
  ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedInsertTask = useCallback(debounce(insertTask, 500), [
    insertTask,
  ]);

  const handleInputChange = async (index: number, value: string) => {
    const newTasks = [...tasks];
    if (newTasks[index]) {
      newTasks[index].name = value;
      if (!newTasks[index].id && value.trim() !== "") {
        // A new task is created only when the task does not have an ID and there is input entered.
        if (type === "12WG" && isHighFocusGoal(newTasks[index])) {
          newTasks[index].clientId = 1;
          newTasks[index].periodName = getSession(SESSIONKEY.periodActive);
        }
        await debouncedInsertTask(newTasks[index], index);
      } else if (newTasks[index].id) {
        // If the task already exists, update the task.
        debouncedUpdateTask(newTasks[index]);
        setTasks(newTasks);
      }

      activeInputIndex.current = index;
      cursorPosition.current = inputRefs.current[index]?.selectionStart || null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTask(index);
    } else if (
      (e.key === "Backspace" || e.key === "Delete") &&
      tasks[index].name.trim() === ""
    ) {
      e.preventDefault();
      if (type !== "12WG") {
        handleDelete(Number(tasks[index].id));
      }
    } else if (allowIndent && tasks[index].indent) {
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        if (tasks[index].indent < (tasks[index - 1]?.indent ?? 0) + 1) {
          changeIndent(index, tasks[index].indent + 1);
        }
      } else if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        if (tasks[index].indent > 0) {
          changeIndent(index, tasks[index].indent - 1);
        }
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
      if (index < tasks.length - 1) {
        activeInputIndex.current = index + 1;
        cursorPosition.current = 0; // Reset cursor to start
        inputRefs.current[index + 1]?.focus();
        inputRefs.current[index + 1]?.setSelectionRange(0, 0); // Set cursor position to start
      }
    }
  };

  const changeIndent = async (index: number, newIndent: number) => {
    cursorPosition.current = inputRefs.current[index]?.selectionStart || null;
    const newTasks = [...tasks];
    newTasks[index].indent = newIndent;
    setTasks(newTasks);

    const taskId = newTasks[index].id;
    if (taskId) {
      await fetch(`/api/${endpoint}/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTasks[index]),
      });
    }

    activeInputIndex.current = index;
  };

  const moveTask = useCallback(
    async (dragIndex: number, hoverIndex: number) => {
      const dragTask = tasks[dragIndex];
      const draggedChildren = [];
      if (allowIndent && dragTask.indent) {
        for (let i = dragIndex + 1; i < tasks.length; i++) {
          const taskIndent = tasks[i].indent ?? 0;
          if (taskIndent > dragTask.indent) {
            draggedChildren.push(tasks[i]);
          } else {
            break;
          }
        }
      }

      const newTasks = [...tasks];
      newTasks.splice(dragIndex, draggedChildren.length + 1);

      newTasks.splice(hoverIndex, 0, dragTask, ...draggedChildren);

      // Update the order field
      const reorderedTasks = newTasks.map((task, index) => ({
        ...task,
        order: index,
      }));

      setTasks(reorderedTasks);

      for (const task of reorderedTasks) {
        if (task.id) {
          await updateTask(task);
        }
      }

      activeInputIndex.current = hoverIndex;
      setDragIndex(null);
      setHoverIndex(null);
    },
    [tasks, allowIndent, updateTask]
  );

  useEffect(() => {
    // Focus on the active input field if an active index exists
    if (activeInputIndex.current !== null) {
      const input = inputRefs.current[activeInputIndex.current];
      if (input) {
        input.focus(); // Set focus to the active input field
        if (cursorPosition.current !== null) {
          input.setSelectionRange(
            cursorPosition.current,
            cursorPosition.current
          ); // Set the cursor position
        }
      }
    }

    // Event listener to update the activeInputIndex when an input field is focused
    const handleFocus = (e: FocusEvent) => {
      const index = inputRefs.current.findIndex((input) => input === e.target);
      if (index !== -1) {
        activeInputIndex.current = index; // Update the active input index
      }
    };

    // Add focus event listener to all input fields
    const inputs = inputRefs.current;
    inputs.forEach((input) => {
      input?.addEventListener("focus", handleFocus);
    });

    // Cleanup the event listeners when the component unmounts or when inputs change
    return () => {
      inputs.forEach((input) => {
        input?.removeEventListener("focus", handleFocus);
      });
    };
  }, [tasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, sourceTasks]);

  return (
    <>
      {tasks.map((task, index) => (
        <DndProvider backend={HTML5Backend} key={index}>
          <TaskItem
            task={task}
            index={index}
            moveTask={moveTask}
            inputRefs={inputRefs}
            orderType={orderType}
            handleInputChange={handleInputChange}
            handleKeyDown={handleKeyDown}
            setHoverIndex={setHoverIndex}
            hoverIndex={hoverIndex}
            setDragIndex={setDragIndex}
            dragIndex={dragIndex}
          />
        </DndProvider>
      ))}
    </>
  );
}
