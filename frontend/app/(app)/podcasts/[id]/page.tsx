'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Calendar,
  User,
  Clock,
  Tag,
  Send,
  Archive,
  Pencil,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { api, formatDate, formatDateTime } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApiQuery } from '@/lib/hooks';
import {
  Button,
  Card,
  CardBody,
  Badge,
  Spinner,
  Toast,
  useToast,
} from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface Episode {
  id: string;
  title: string;
  slug: string;
  speaker?: string | null;
  series?: string | null;
  episodeNumber?: number | null;
  publishDate?: string | null;
  durationMinutes?: number | null;
  audioUrl?: string | null;
  artworkUrl?: string | null;
  status: string;
  description?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, 'green' | 'amber' | 'slate'> = {
  PUBLISHED: 'green',
  DRAFT: 'amber',
  ARCHIVED: 'slate',
};

function minutesLabel(mins: number | null | undefined) {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function EpisodeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const { toast, message } = useToast();
  const readOnly = user?.role === 'DEPARTMENT_LEADER';

  const { data: episode, isLoading, error } = useApiQuery<Episode>(
    ['podcast', id],
    `/podcasts/${id}`,
  );

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!episode?.audioUrl) return;

    const audio = new Audio(episode.audioUrl);
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('ended', () => setPlaying(false));

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [episode?.audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * duration;
  };

  const skipBack = () => {
    if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 15);
  };

  const skipForward = () => {
    if (audioRef.current) audioRef.current.currentTime = Math.min(duration, currentTime + 15);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !muted;
    setMuted(!muted);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const v = Number(e.target.value);
    audio.volume = v;
    setVolume(v);
    setMuted(v === 0);
  };

  const handlePublish = async () => {
    try {
      await api(`/podcasts/${id}/publish`, { method: 'POST' });
      toast('Episode published');
      window.location.reload();
    } catch {
      toast('Failed to publish episode');
    }
  };

  const handleArchive = async () => {
    try {
      await api(`/podcasts/${id}/archive`, { method: 'POST' });
      toast('Episode archived');
      window.location.reload();
    } catch {
      toast('Failed to archive episode');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this episode? This action cannot be undone.')) return;
    try {
      await api(`/podcasts/${id}`, { method: 'DELETE' });
      toast('Episode deleted');
      router.push('/podcasts');
    } catch {
      toast('Failed to delete episode');
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (error || !episode) return <div className="py-20 text-center text-slate-500">Episode not found</div>;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/podcasts" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{episode.title}</h1>
          <p className="text-sm text-slate-500">
            {episode.series && `${episode.series}`}
            {episode.episodeNumber && ` #${episode.episodeNumber}`}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {episode.audioUrl && (
            <ErrorBoundary>
              <Card>
                <CardBody className="p-6">
                  <div className="flex items-center gap-6">
                    {episode.artworkUrl ? (
                      <img
                        src={episode.artworkUrl}
                        alt={episode.title}
                        className="h-24 w-24 rounded-xl object-cover shadow-lg"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-lg">
                        <span className="text-3xl font-bold text-white">{episode.episodeNumber ?? 1}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-slate-800">{episode.title}</h2>
                      {episode.speaker && <p className="text-sm text-slate-500">{episode.speaker}</p>}

                      <div className="mt-3">
                        <div
                          className="relative h-2 cursor-pointer rounded-full bg-slate-200"
                          onClick={seek}
                        >
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-brand-500 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-xs text-slate-400">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <button
                          onClick={skipBack}
                          className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          title="Back 15 seconds"
                        >
                          <SkipBack className="h-5 w-5" />
                        </button>
                        <button
                          onClick={togglePlay}
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-brand-700"
                        >
                          {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
                        </button>
                        <button
                          onClick={skipForward}
                          className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          title="Forward 15 seconds"
                        >
                          <SkipForward className="h-5 w-5" />
                        </button>
                        <div className="ml-4 flex items-center gap-2">
                          <button onClick={toggleMute} className="text-slate-400 hover:text-slate-600">
                            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={muted ? 0 : volume}
                            onChange={handleVolume}
                            className="w-20 accent-brand-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </ErrorBoundary>
          )}

          {episode.description && (
            <ErrorBoundary>
              <Card>
                <CardBody>
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">Description</h3>
                  <p className="whitespace-pre-wrap text-sm text-slate-600">{episode.description}</p>
                </CardBody>
              </Card>
            </ErrorBoundary>
          )}

          {!episode.audioUrl && episode.artworkUrl && (
            <ErrorBoundary>
              <Card>
                <CardBody className="flex justify-center p-6">
                  <img
                    src={episode.artworkUrl}
                    alt={episode.title}
                    className="max-h-80 rounded-xl object-contain shadow-lg"
                  />
                </CardBody>
              </Card>
            </ErrorBoundary>
          )}
        </div>

        <div className="space-y-6">
          <ErrorBoundary>
            <Card>
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge color={STATUS_COLORS[episode.status] ?? 'slate'}>
                    {episode.status.charAt(0) + episode.status.slice(1).toLowerCase()}
                  </Badge>
                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      {episode.status === 'DRAFT' && (
                        <Button variant="ghost" size="sm" onClick={handlePublish} title="Publish">
                          <Send className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}
                      {episode.status === 'PUBLISHED' && (
                        <Button variant="ghost" size="sm" onClick={handleArchive} title="Archive">
                          <Archive className="h-4 w-4 text-amber-600" />
                        </Button>
                      )}
                      <Link href={`/podcasts`}>
                        <Button variant="ghost" size="sm" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={handleDelete} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-4">
                  {episode.speaker && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">{episode.speaker}</span>
                    </div>
                  )}
                  {episode.series && (
                    <div className="flex items-center gap-2 text-sm">
                      <Tag className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">{episode.series}{episode.episodeNumber ? ` #${episode.episodeNumber}` : ''}</span>
                    </div>
                  )}
                  {episode.publishDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">{formatDate(episode.publishDate)}</span>
                    </div>
                  )}
                  {episode.durationMinutes != null && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">{minutesLabel(episode.durationMinutes)}</span>
                    </div>
                  )}
                </div>

                {episode.tags?.length > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="mb-2 text-xs font-medium text-slate-500">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {episode.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-4 text-xs text-slate-400">
                  <p>Created: {formatDateTime(episode.createdAt)}</p>
                  <p className="mt-1">Updated: {formatDateTime(episode.updatedAt)}</p>
                </div>
              </CardBody>
            </Card>
          </ErrorBoundary>
        </div>
      </div>

      <Toast message={message} />
    </div>
  );
}
