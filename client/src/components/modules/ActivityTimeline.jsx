import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, CheckCircle, Upload, MessageSquare, UserPlus, Edit } from 'lucide-react';
import * as activityService from '../../services/activityService';
import { formatDistanceToNow } from 'date-fns';

const ActivityTimeline = ({ module }) => {
  const { workspaceId } = useParams();
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadActivities();
  }, [workspaceId]);

  const loadActivities = async () => {
    try {
      setError('');
      const { data } = await activityService.getActivities(workspaceId);
      setActivities(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load activities');
    }
  };

  const getIcon = (action) => {
    if (action.includes('task')) return CheckCircle;
    if (action.includes('upload')) return Upload;
    if (action.includes('message')) return MessageSquare;
    if (action.includes('invited')) return UserPlus;
    return Edit;
  };

  return (
    <div className="glass-panel p-4">
      <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
      {error && <div className="mb-3 text-sm text-red-400">{error}</div>}
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = getIcon(activity.action);
          return (
            <div key={activity._id} className="flex items-start space-x-3">
              <div className="bg-white/10 p-2 rounded-full">
                <Icon size={16} />
              </div>
              <div>
                <p>
                  <span className="font-medium">{activity.user?.name}</span> {activity.action}{' '}
                  <span className="text-accent">{activity.target}</span>
                </p>
                <p className="text-xs text-gray-400 flex items-center mt-1">
                  <Clock size={12} className="mr-1" />
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
        {activities.length === 0 && (
          <div className="text-center text-gray-400 py-8">No activity yet</div>
        )}
      </div>
    </div>
  );
};

export default ActivityTimeline;