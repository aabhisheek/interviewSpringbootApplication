"use client";

import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import SkillCard from "@/components/SkillCard";
import ProtectedRoute from "@/components/ProtectedRoute";
import { searchSkills } from "@/lib/api";

interface Skill {
  id: string;
  name: string;
  type?: { id: string; name: string };
  infoUrl?: string;
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = async (query: string, limit: number) => {
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const data = await searchSkills(query, limit);
      setSkills(data.data || []);
    } catch {
      setError("Failed to fetch skills. Make sure the backend is running on port 8080.");
      setSkills([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Skills Explorer</h2>
          <p className="text-slate-500 text-sm mt-1">Search and explore professional skills from the Lightcast database</p>
        </div>

        <SearchBar onSearch={handleSearch} placeholder="e.g. Java, Python, React..." loading={loading} />

        {error && (
          <div className="mt-5 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {skills.length > 0 && (
          <p className="mt-6 text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">
            {skills.length} result{skills.length !== 1 ? "s" : ""}
          </p>
        )}

        <div className="space-y-2">
          {skills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>

        {searched && !loading && !error && skills.length === 0 && (
          <div className="mt-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">No skills found for that query.</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
