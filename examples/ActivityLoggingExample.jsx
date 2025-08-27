// Example of how to use the activity logger in your components

import React from 'react';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import Button from '@/components/ui/Button';

const ActivityLoggingExample = () => {
  const { logFacility, logDisease, logSymptom, logHealthyLiving, logUser } = useActivityLogger();

  const handleFacilityAction = async () => {
    // Log when a facility is created
    await logFacility("created", "facility-123");
  };

  const handleDiseaseAction = async () => {
    // Log when a disease is updated
    await logDisease("updated", "disease-456");
  };

  const handleSymptomAction = async () => {
    // Log when a symptom is deleted
    await logSymptom("deleted", "symptom-789");
  };

  const handleHealthyLivingAction = async () => {
    // Log when a healthy living article is created
    await logHealthyLiving("created", "article-101");
  };

  const handleUserAction = async () => {
    // Log when a user is managed
    await logUser("viewed profile", "user-202");
  };

  return (
    <div className="space-y-4">
      <h3>Activity Logging Examples</h3>
      
      <div className="flex space-x-2">
        <Button 
          text="Log Facility Action" 
          onClick={handleFacilityAction}
          className="btn-sm"
        />
        <Button 
          text="Log Disease Action" 
          onClick={handleDiseaseAction}
          className="btn-sm"
        />
        <Button 
          text="Log Symptom Action" 
          onClick={handleSymptomAction}
          className="btn-sm"
        />
        <Button 
          text="Log Healthy Living Action" 
          onClick={handleHealthyLivingAction}
          className="btn-sm"
        />
        <Button 
          text="Log User Action" 
          onClick={handleUserAction}
          className="btn-sm"
        />
      </div>
    </div>
  );
};

export default ActivityLoggingExample;
