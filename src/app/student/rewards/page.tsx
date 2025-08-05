
// src/app/student/rewards/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Award, Star, Trophy, Zap, ShieldCheck, Rocket, Loader2, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface RewardFromAPI {
  id: string | number;
  title: string;
  description: string;
  icon: string; // The image URL for the badge
  progress?: {
      current: number;
      target: number;
      text: string;
  }
}

interface UserRewardFromAPI {
  id: string | number;
  reward: string | number; // ID of the reward
  reward_details: RewardFromAPI; // Nested reward details
  achieved_at: string;
}

interface DisplayReward {
  id: string;
  title: string;
  description: string;
  icon_url: string; 
  achieved: boolean;
  achieved_at?: string;
  progress?: {
      current: number;
      target: number;
      text: string;
  }
}

const rewardStyles = [
  { iconColor: "text-amber-500", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  { iconColor: "text-sky-500", bgColor: "bg-sky-100 dark:bg-sky-900/30" },
  { iconColor: "text-lime-500", bgColor: "bg-lime-100 dark:bg-lime-900/30" },
  { iconColor: "text-rose-500", bgColor: "bg-rose-100 dark:bg-rose-900/30" },
  { iconColor: "text-indigo-500", bgColor: "bg-indigo-100 dark:bg-indigo-900/30" },
  { iconColor: "text-teal-500", bgColor: "bg-teal-100 dark:bg-teal-900/30" },
];

export default function StudentRewardsPage() {
  const { currentUser } = useAuth();
  const [allRewards, setAllRewards] = useState<DisplayReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRewards = async () => {
      if (!currentUser) {
        setIsLoading(false);
        setError("User not authenticated.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const [achievedRewardsResponse, progressRewardsData] = await Promise.all([
            api.get<{ results: UserRewardFromAPI[] }>(`/user-rewards/?user=${currentUser.id}`),
            api.get<RewardFromAPI[]>(`/rewards/progress/`)
        ]);
        
        const achievedRewardsList = achievedRewardsResponse.results || [];
        const progressRewardsList = Array.isArray(progressRewardsData) ? progressRewardsData : [];

        const achievedRewards = achievedRewardsList.map(ur => ({
            id: String(ur.reward_details.id),
            title: ur.reward_details.title,
            description: ur.reward_details.description,
            icon_url: ur.reward_details.icon,
            achieved: true,
            achieved_at: ur.achieved_at,
        }));
        
        const progressRewards = progressRewardsList.map(r => ({
            id: String(r.id),
            title: r.title,
            description: r.description,
            icon_url: r.icon,
            achieved: false,
            progress: r.progress,
        }));
        
        setAllRewards([...achievedRewards, ...progressRewards]);

      } catch (err) {
        console.error("Failed to fetch rewards:", err);
        setError(err instanceof Error ? err.message : "Could not load rewards data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRewards();
  }, [currentUser]);

  const achievedRewardsList = allRewards.filter(r => r.achieved);
  const lockedRewardsList = allRewards.filter(r => !r.achieved);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-10 w-1/3 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-10 w-1/3 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
           {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl opacity-70" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
       <Card className="text-center py-10 bg-destructive/10 border-destructive rounded-xl shadow-lg">
        <CardHeader>
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <CardTitle>Error Loading Rewards</CardTitle>
        </CardHeader>
        <CardContent>
            <CardDescription className="text-destructive-foreground">{error}</CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-12">
      <header className="py-10 bg-gradient-to-br from-primary to-accent text-primary-foreground text-center rounded-xl shadow-xl">
        <Trophy className="mx-auto h-20 w-20 mb-4 drop-shadow-lg" />
        <h1 className="text-4xl md:text-5xl font-bold">My Rewards & Achievements</h1>
        <p className="text-lg md:text-xl mt-3 max-w-2xl mx-auto">Keep learning to unlock more amazing badges!</p>
      </header>

      <section>
        <h2 className="text-3xl font-semibold mb-6 pb-2 border-b-2 border-primary">
          Unlocked Badges ({achievedRewardsList.length})
        </h2>
        {achievedRewardsList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievedRewardsList.map((reward, index) => (
              <Card key={reward.id} className={`shadow-xl rounded-xl border-2 border-green-500 ${rewardStyles[index % rewardStyles.length].bgColor} transform hover:scale-105 transition-transform duration-200`}>
                <CardHeader className="flex flex-row items-center gap-4 pb-3 pt-5">
                  <Image src={reward.icon_url} alt={reward.title} width={48} height={48} className="drop-shadow-md" data-ai-hint="badge icon"/>
                  <CardTitle className="text-xl text-foreground">{reward.title}</CardTitle>
                </CardHeader>
                <CardContent className="pb-5">
                  <CardDescription className="text-sm text-muted-foreground">{reward.description}</CardDescription>
                  {reward.achieved_at && <p className="text-xs text-green-600 dark:text-green-400 mt-2">Achieved: {new Date(reward.achieved_at).toLocaleDateString()}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
            <p className="text-muted-foreground text-center py-6">No badges unlocked yet. Keep learning!</p>
        )}
      </section>

      <section>
        <h2 className="text-3xl font-semibold mb-6 pb-2 border-b-2 border-muted">
          Keep Going! ({lockedRewardsList.length} more to unlock)
        </h2>
        {lockedRewardsList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {lockedRewardsList.map((reward, index) => {
              const progressPercentage = reward.progress && reward.progress.target > 0 
                ? (reward.progress.current / reward.progress.target) * 100 
                : 0;

              return (
                <Card key={reward.id} className={`shadow-md rounded-xl opacity-80 hover:opacity-100 transition-opacity duration-200 flex flex-col ${rewardStyles[index % rewardStyles.length].bgColor}`}>
                <CardHeader className="flex flex-row items-center gap-4 pb-3 pt-5">
                    <Image src={reward.icon_url} alt={reward.title} width={48} height={48} className="opacity-60" data-ai-hint="badge icon locked"/>
                    <CardTitle className="text-xl text-muted-foreground">{reward.title}</CardTitle>
                </CardHeader>
                <CardContent className="pb-5 flex-grow">
                    <CardDescription className="text-sm text-muted-foreground">{reward.description}</CardDescription>
                </CardContent>
                 {reward.progress && (
                    <CardContent className="pt-0 pb-5">
                       <p className="text-xs font-medium text-muted-foreground mb-1">Progress: {reward.progress.text}</p>
                       <Progress value={progressPercentage} className="h-2" />
                    </CardContent>
                  )}
                </Card>
              )
            })}
            </div>
        ) : (
            <p className="text-muted-foreground text-center py-6">Congratulations! You've unlocked all available badges!</p>
        )}
      </section>
    </div>
  );
}
