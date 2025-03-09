"use client";

import { motion } from "framer-motion";
import { BotIcon, UserIcon } from "./icon";
import { ReactNode } from "react";
import { Markdown } from "./markdown";

export const Message = ({
  role,
  content,
  model,
}: {
  role: string;
  content: string | ReactNode;
  model: boolean;
}) => {
  return (
    <motion.div
      className={`flex flex-row gap-4 px-4 w-full md:w-[650px] md:px-0 first-of-type:pt-20 ${
        model
          ? "bg-zinc-900 text-zinc-300 shadow-none"
          : "bg-white text-zinc-800 shadow-sm"
      } p-4 rounded-lg transition-colors duration-300`}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div
        className={`size-[24px] flex flex-col justify-center items-center flex-shrink-0 ${
          model ? "text-zinc-500" : "text-zinc-400"
        }`}
      >
        {role === "assistant" ? <BotIcon /> : <UserIcon />}
      </div>

      <div className="flex flex-col gap-6 w-full">
        <div
          className={`flex flex-col gap-4 ${
            model ? "text-zinc-300" : "text-zinc-800"
          }`}
        >
          <Markdown mode={model ? "dark" : "light"}>
            {content as string}
          </Markdown>
        </div>
      </div>
    </motion.div>
  );
};
