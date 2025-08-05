import type { ClassLevel } from '@/interfaces';
import SubjectCard from './SubjectCard';

interface ClassSectionProps {
  classLevelData: ClassLevel;
}

const ClassSection: React.FC<ClassSectionProps> = ({ classLevelData }) => {
  return (
    <section className="mb-12">
      <h2 className="text-3xl font-poppins font-semibold mb-6 pb-2 border-b-2 border-primary">
        {classLevelData.title} (Class {classLevelData.level})
      </h2>
      {classLevelData.subjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {classLevelData.subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} classLevel={classLevelData.level} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No subjects available for this class yet.</p>
      )}
    </section>
  );
};

export default ClassSection;
