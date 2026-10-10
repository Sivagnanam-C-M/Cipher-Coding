'use client';

import React, { useEffect, useState } from 'react';
import {
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  RotateCw,
  Code,
  Save,
} from 'lucide-react';
import TerminalCard from '@/components/ui/TerminalCard';
import CyberButton from '@/components/ui/CyberButton';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import CodeViewer from '@/components/ui/CodeViewer';

interface QuestionItem {
  _id: string;
  questionNumber: number;
  title: string;
  section: string;
  storyText: string;
  codeBlock: string;
  codeBlocks?: {
    python?: string;
    java?: string;
    c?: string;
    cpp?: string;
  };
  questionText: string;
  answerType: 'text' | 'number' | 'case_insensitive_text' | 'exact_text' | 'multiple_choice';
  correctAnswer: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'insane';
  hint: string;
  explanation: string;
  isFinal: boolean;
  isPublished: boolean;
}

const emptyQuestionForm: Omit<QuestionItem, '_id'> = {
  questionNumber: 1,
  title: '',
  section: 'FORENSIC LOGIC',
  storyText: '',
  codeBlock: '',
  codeBlocks: {
    python: '',
    java: '',
    c: '',
    cpp: '',
  },
  questionText: '',
  answerType: 'case_insensitive_text',
  correctAnswer: '',
  points: 10,
  difficulty: 'medium',
  hint: '',
  explanation: '',
  isFinal: false,
  isPublished: true,
};

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyQuestionForm);
  const [activeEditorLang, setActiveEditorLang] = useState<'python' | 'java' | 'c' | 'cpp'>('python');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/admin/questions');
      const data = await res.json();
      if (res.ok) {
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error('Failed to load questions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const openCreateModal = () => {
    const nextNum = (questions[questions.length - 1]?.questionNumber || 0) + 1;
    setEditingId(null);
    setFormData({
      ...emptyQuestionForm,
      questionNumber: nextNum,
    });
    setActiveEditorLang('python');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (q: QuestionItem) => {
    setEditingId(q._id);
    setFormData({
      questionNumber: q.questionNumber,
      title: q.title,
      section: q.section,
      storyText: q.storyText || '',
      codeBlock: q.codeBlock || '',
      codeBlocks: {
        python: q.codeBlocks?.python || q.codeBlock || '',
        java: q.codeBlocks?.java || '',
        c: q.codeBlocks?.c || '',
        cpp: q.codeBlocks?.cpp || '',
      },
      questionText: q.questionText,
      answerType: q.answerType,
      correctAnswer: q.correctAnswer || '',
      points: q.points,
      difficulty: q.difficulty,
      hint: q.hint || '',
      explanation: q.explanation || '',
      isFinal: q.isFinal,
      isPublished: q.isPublished,
    });
    setActiveEditorLang('python');
    setError(null);
    setModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = editingId
        ? `/api/admin/questions/${editingId}`
        : '/api/admin/questions';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save question');

      setModalOpen(false);
      await fetchQuestions();
    } catch (err: any) {
      setError(err.message || 'Error saving question');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/admin/questions/${deletingId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteModalOpen(false);
        setDeletingId(null);
        await fetchQuestions();
      }
    } catch (err) {
      console.error('Error deleting question', err);
    }
  };

  const togglePublish = async (q: QuestionItem) => {
    try {
      await fetch(`/api/admin/questions/${q._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !q.isPublished }),
      });
      await fetchQuestions();
    } catch (err) {
      console.error('Failed to toggle publish status', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] font-mono text-amber-400">
        <RotateCw className="w-6 h-6 animate-spin mr-3" />
        <span>LOADING QUESTION VAULT...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-amber-400" />
            QUESTION REPOSITORY
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Data-driven question management. All competition challenges are stored dynamically in the database.
          </p>
        </div>

        <CyberButton
          variant="amber"
          size="md"
          onClick={openCreateModal}
          icon={<Plus className="w-4 h-4" />}
        >
          CREATE NEW QUESTION
        </CyberButton>
      </div>

      {/* Questions Table */}
      <TerminalCard glowColor="cyan">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">TITLE & SECTION</th>
                <th className="py-3 px-4">DIFFICULTY</th>
                <th className="py-3 px-4">TYPE</th>
                <th className="py-3 px-4">POINTS</th>
                <th className="py-3 px-4">ANSWER KEY</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {questions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No questions found. Click &quot;Create New Question&quot; to seed an investigation fragment.
                  </td>
                </tr>
              ) : (
                questions.map((q) => (
                  <tr key={q._id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-amber-400">
                      {q.questionNumber.toString().padStart(2, '0')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        {q.title}
                        {q.isFinal && <Badge variant="crimson" size="sm">FINAL</Badge>}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase">{q.section}</div>
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-300">
                      {q.difficulty}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {q.answerType}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      +{q.points}
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-300 select-all">
                      {q.correctAnswer}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => togglePublish(q)}
                        title="Click to toggle publish status"
                        className="inline-flex items-center gap-1"
                      >
                        {q.isPublished ? (
                          <Badge variant="emerald" size="sm">PUBLISHED</Badge>
                        ) : (
                          <Badge variant="slate" size="sm">DRAFT</Badge>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(q)}
                        className="p-1 rounded text-cyan-400 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
                        title="Edit question"
                      >
                        <Edit2 className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingId(q._id);
                          setDeleteModalOpen(true);
                        }}
                        className="p-1 rounded text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors"
                        title="Delete question"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TerminalCard>

      {/* Create / Edit Question Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl my-8 bg-[#0d1321] border border-slate-700 rounded-lg shadow-2xl overflow-hidden font-mono text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#080c14] border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Code className="w-4 h-4" />
                {editingId ? 'EDIT INVESTIGATION FRAGMENT' : 'CREATE INVESTIGATION FRAGMENT'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveQuestion} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {error && (
                <div className="p-3 rounded bg-red-950/40 border border-red-500/50 text-red-300">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">QUESTION NUMBER</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.questionNumber}
                    onChange={(e) => setFormData({ ...formData, questionNumber: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 uppercase mb-1">TITLE</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Memory Dump Decryption"
                    className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">SECTION / CATEGORY</label>
                  <input
                    type="text"
                    required
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    placeholder="e.g. NETWORK INTRUSION, MALWARE DISSECTION"
                    className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 uppercase mb-1">DIFFICULTY</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="insane">Insane</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">STORY / INVESTIGATION CONTEXT</label>
                <textarea
                  rows={2}
                  value={formData.storyText}
                  onChange={(e) => setFormData({ ...formData, storyText: e.target.value })}
                  placeholder="Forensic context detailing how this code was recovered from the compromised server..."
                  className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 uppercase">RECOVERED CODE BLOCKS</label>
                  <div className="flex items-center space-x-1">
                    {(['python', 'java', 'c', 'cpp'] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setActiveEditorLang(lang)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${
                          activeEditorLang === lang
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                            : 'text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {lang === 'cpp' ? 'C++' : lang}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={8}
                  value={
                    (formData.codeBlocks && formData.codeBlocks[activeEditorLang]) ||
                    (activeEditorLang === 'python' ? formData.codeBlock : '')
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      codeBlock: activeEditorLang === 'python' ? val : formData.codeBlock,
                      codeBlocks: {
                        ...(formData.codeBlocks || { python: '', java: '', c: '', cpp: '' }),
                        [activeEditorLang]: val,
                      },
                    });
                  }}
                  placeholder={`// Enter ${activeEditorLang.toUpperCase()} code fragment here...`}
                  className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Currently editing: <strong className="text-cyan-400 uppercase">{activeEditorLang}</strong> variant. Operatives receive the variant matching their preferred language.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">DECIPHER PROMPT / QUESTION TEXT</label>
                <input
                  type="text"
                  required
                  value={formData.questionText}
                  onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                  placeholder="What is the decoded output of the function call cipher_execute(payload)?"
                  className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">ANSWER TYPE</label>
                  <select
                    value={formData.answerType}
                    onChange={(e) => setFormData({ ...formData, answerType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100"
                  >
                    <option value="case_insensitive_text">Case-Insensitive Text</option>
                    <option value="exact_text">Exact Text</option>
                    <option value="number">Number</option>
                    <option value="text">General Text</option>
                    <option value="multiple_choice">Multiple Choice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 uppercase mb-1">CORRECT ANSWER</label>
                  <input
                    type="text"
                    required
                    value={formData.correctAnswer}
                    onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                    placeholder="Secret token / number"
                    className="w-full px-3 py-2 bg-[#06090e] border border-amber-500/50 rounded text-amber-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 uppercase mb-1">POINTS AWARDED</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">HINT (OPTIONAL)</label>
                  <input
                    type="text"
                    value={formData.hint}
                    onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                    placeholder="Consider the parity bit behavior..."
                    className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 uppercase mb-1">EXPLANATION (OPTIONAL)</label>
                  <input
                    type="text"
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    placeholder="Solution walkthrough..."
                    className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-6 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFinal}
                    onChange={(e) => setFormData({ ...formData, isFinal: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                  />
                  <span className="text-slate-300 uppercase font-semibold">MARK AS FINAL CHALLENGE</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                  />
                  <span className="text-slate-300 uppercase font-semibold">PUBLISHED FOR OPERATIVES</span>
                </label>
              </div>

              {/* Form Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <CyberButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setModalOpen(false)}
                >
                  CANCEL
                </CyberButton>
                <CyberButton
                  variant="amber"
                  size="sm"
                  type="submit"
                  isLoading={saving}
                  icon={<Save className="w-4 h-4" />}
                >
                  SAVE FRAGMENT
                </CyberButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="CONFIRM FRAGMENT PURGE"
        description="Are you sure you want to permanently delete this question fragment? All participant submissions for this question will remain in the audit log."
        confirmLabel="PURGE QUESTION"
        confirmVariant="crimson"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
