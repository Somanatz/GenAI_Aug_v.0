import Link from 'next/link';
import type { Subject } from '@/interfaces';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SubjectCardProps {
  subject: Subject;
  classLevel: number;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, classLevel }) => {
  const IconComponent = subject.icon;

  return (
    <Link href={subject.href || '#'} className="block h-full">
        <Card className="flex flex-col h-full shadow-lg hover:shadow-xl hover:border-primary/50 transition-all duration-300 rounded-xl overflow-hidden">
            <CardHeader className={`p-6 ${subject.bgColor || 'bg-secondary'}`}>
                <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg bg-background/20 ${subject.textColor || 'text-primary'}`}>
                    {IconComponent && <IconComponent size={32} strokeWidth={1.5} />}
                </div>
                <div>
                    <CardTitle className={`font-poppins text-xl ${subject.textColor || 'text-primary-foreground'}`}>{subject.name}</CardTitle>
                    <CardDescription className={`${subject.textColor ? 'text-white/80' : 'text-muted-foreground'} text-xs`}>
                    Class {classLevel}
                    </CardDescription>
                </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 flex-grow">
                <p className="text-sm text-muted-foreground mb-4 h-20 overflow-hidden">
                {subject.description}
                </p>
            </CardContent>
            <CardFooter className="p-6 pt-0 border-t flex-col items-start">
                <div className="flex justify-between items-center w-full mb-1">
                    <span className="text-xs font-medium text-muted-foreground">Progress</span>
                    <span className="text-xs font-bold text-primary">{Math.round(subject.progress || 0)}%</span>
                </div>
                <Progress value={subject.progress || 0} className="h-2" />
            </CardFooter>
        </Card>
    </Link>
  );
};

export default SubjectCard;
