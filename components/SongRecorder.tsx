"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, Square, Play, Pause, Upload, Check, AlertCircle, Loader2, Trash2 } from 'lucide-react';

interface Song {
  id: string;
  name: string;
  audioBlob?: Blob;
  ipfsHash?: string;
  isRecording?: boolean;
  isUploading?: boolean;
  uploaded?: boolean;
}

interface SongRecorderProps {
  song: Song;
  songNumber: number;
  onUpdate: (updates: Partial<Song>) => void;
  onRemove: () => void;
}

export function SongRecorder({ song, songNumber, onUpdate, onRemove }: SongRecorderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaRecorder not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder not supported in this browser');
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onUpdate({ audioBlob: blob });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.onerror = (event) => {
        setError('Recording error occurred');
      };
      
      mediaRecorder.start();
      onUpdate({ isRecording: true });
      setRecordingTime(0);
      setError(null);
      
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      let errorMessage = 'Failed to start recording. ';
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Microphone permission denied.';
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No microphone found.';
        } else {
          errorMessage += 'Please check your microphone.';
        }
      } else if (error instanceof Error && error.message.includes('MediaRecorder not supported')) {
        errorMessage += 'Your browser does not support audio recording.';
      } else {
        errorMessage += 'Please check your microphone and browser settings.';
      }
      
      setError(errorMessage);
    }
  }, [onUpdate]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && song.isRecording) {
      mediaRecorderRef.current.stop();
      onUpdate({ isRecording: false });
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [song.isRecording, onUpdate]);

  const playAudio = useCallback(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl]);

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ name: e.target.value });
  };

    return (
    <div className="grid grid-cols-12 gap-4 py-3 px-4 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors group">
      <div className="col-span-1 flex items-center">
        <span className="text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-white text-sm font-mono transition-colors">
          {songNumber}
        </span>
      </div>

      <div className="col-span-6 flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {!song.isRecording ? (
            <Button
              onClick={startRecording}
              size="sm"
              className="bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white w-8 h-8 p-0 transition-all"
              disabled={song.uploaded}
            >
              <Mic className="w-3 h-3" />
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              size="sm"
              className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 p-0 transition-all"
            >
              <Square className="w-3 h-3" />
            </Button>
          )}

          {audioUrl && !song.isRecording && (
            <>
              {!isPlaying ? (
                <Button 
                  onClick={playAudio} 
                  size="sm" 
                  className="bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white w-8 h-8 p-0 transition-all"
                >
                  <Play className="w-3 h-3" />
                </Button>
              ) : (
                <Button 
                  onClick={pauseAudio} 
                  size="sm" 
                  className="bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white w-8 h-8 p-0 transition-all"
                >
                  <Pause className="w-3 h-3" />
                </Button>
              )}
            </>
          )}
        </div>

        <div className="flex-1">
          <Input
            value={song.name}
            onChange={handleNameChange}
            className="bg-transparent border-none text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800 text-base p-2 transition-all"
            placeholder="Song title..."
            disabled={song.uploaded}
          />
        </div>
      </div>

      <div className="col-span-2 flex items-center text-gray-500 dark:text-gray-400 text-sm transition-colors">
        {song.isRecording && (
          <span className="text-red-500 dark:text-red-400 font-mono transition-colors">
            {formatTime(recordingTime)}
          </span>
        )}
      </div>

      <div className="col-span-2 flex items-center justify-center">
        {song.isUploading && (
          <div className="flex items-center text-blue-600 dark:text-blue-400 text-xs transition-colors">
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
            Uploading
          </div>
        )}
        {song.uploaded && (
          <div className="flex items-center text-green-600 dark:text-green-400 text-xs transition-colors">
            <Check className="w-3 h-3 mr-1" />
            Uploaded
          </div>
        )}
        {!song.audioBlob && !song.isRecording && !song.uploaded && (
          <span className="text-gray-400 dark:text-gray-500 text-xs transition-colors">Not recorded</span>
        )}
        {song.audioBlob && !song.uploaded && !song.isUploading && (
          <span className="text-amber-600 dark:text-yellow-400 text-xs transition-colors">Ready to upload</span>
        )}
      </div>

      <div className="col-span-1 flex items-center justify-end">
        <Button
          onClick={onRemove}
          size="sm"
          className="bg-transparent hover:bg-red-500 text-gray-500 dark:text-gray-400 hover:text-white w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      {error && (
        <div className="col-span-12 mt-2">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-2 transition-all">
            <div className="flex items-center text-red-700 dark:text-red-400 text-xs transition-colors">
              <AlertCircle className="w-3 h-3 mr-1" />
              {error}
            </div>
          </div>
        </div>
      )}

      {audioUrl && (
        <audio 
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
    </div>
  );
} 