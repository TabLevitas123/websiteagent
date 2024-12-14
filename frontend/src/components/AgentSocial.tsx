import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import '../styles/AgentSocial.css';

interface AgentSocialProps {
  agentAddress: string;
  onClose: () => void;
}

interface Comment {
  id: string;
  content: string;
  timestamp: string;
  commenter: {
    name: string;
    imageUrl: string;
    verificationStatus: string;
  };
}

interface Activity {
  id: string;
  activityType: string;
  timestamp: string;
  metadata: any;
  agent: {
    name: string;
    imageUrl: string;
    verificationStatus: string;
  };
}

const AgentSocial: React.FC<AgentSocialProps> = ({
  agentAddress,
  onClose,
}) => {
  const { publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState<'feed' | 'comments'>('feed');
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    checkFollowStatus();
  }, [agentAddress]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [commentsRes, feedRes] = await Promise.all([
        fetch(`/api/agents/${agentAddress}/comments`),
        fetch(`/api/agents/${agentAddress}/feed`),
      ]);

      if (!commentsRes.ok || !feedRes.ok) {
        throw new Error('Failed to load social data');
      }

      const [commentsData, feedData] = await Promise.all([
        commentsRes.json(),
        feedRes.json(),
      ]);

      setComments(commentsData.comments);
      setActivities(feedData.activities);
    } catch (err) {
      console.error('Error loading social data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load social data');
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!publicKey) return;

    try {
      const response = await fetch(`/api/agents/${agentAddress}/followers`);
      if (!response.ok) {
        throw new Error('Failed to check follow status');
      }

      const data = await response.json();
      setIsFollowing(data.followers.some(
        (f: any) => f.followerAddress === publicKey.toBase58()
      ));
    } catch (err) {
      console.error('Error checking follow status:', err);
    }
  };

  const handleFollow = async () => {
    if (!publicKey) {
      setError('Please connect your wallet');
      return;
    }

    try {
      const response = await fetch('/api/agents/follow', {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentAddress,
          followerAddress: publicKey.toBase58(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isFollowing ? 'unfollow' : 'follow'} agent`);
      }

      setIsFollowing(!isFollowing);
    } catch (err) {
      console.error('Error following/unfollowing:', err);
      setError(err instanceof Error ? err.message : 'Failed to update follow status');
    }
  };

  const handleComment = async () => {
    if (!publicKey) {
      setError('Please connect your wallet');
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    try {
      const response = await fetch('/api/agents/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentAddress,
          commenterAddress: publicKey.toBase58(),
          content: newComment.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const comment = await response.json();
      setComments(prev => [comment, ...prev]);
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderActivityContent = (activity: Activity) => {
    switch (activity.activityType) {
      case 'COMMENT':
        return (
          <div className="activity-content">
            <span className="activity-actor">{activity.agent.name}</span>
            {' commented: '}
            <span className="activity-detail">
              {activity.metadata.content}
            </span>
          </div>
        );
      case 'FUNCTION_ADDED':
        return (
          <div className="activity-content">
            <span className="activity-actor">{activity.agent.name}</span>
            {' added new function: '}
            <span className="activity-detail">
              {activity.metadata.functionName}
            </span>
          </div>
        );
      default:
        return (
          <div className="activity-content">
            <span className="activity-actor">{activity.agent.name}</span>
            {' performed an action'}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="agent-social">
        <div className="loading-spinner">Loading social data...</div>
      </div>
    );
  }

  return (
    <div className="agent-social">
      <div className="social-header">
        <h3>Agent Social</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="social-content">
        <div className="social-actions">
          <button
            className="follow-button"
            onClick={handleFollow}
            disabled={!publicKey}
          >
            {isFollowing ? 'Unfollow' : 'Follow'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="tabs">
          <button
            className={`tab-button ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            Feed
          </button>
          <button
            className={`tab-button ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            Comments
          </button>
        </div>

        {activeTab === 'feed' ? (
          <div className="feed">
            {activities.length === 0 ? (
              <p className="no-data">No activities yet</p>
            ) : (
              activities.map(activity => (
                <div key={activity.id} className="activity-item">
                  <img
                    src={activity.agent.imageUrl || '/default-agent.png'}
                    alt={activity.agent.name}
                    className="activity-avatar"
                  />
                  <div className="activity-details">
                    {renderActivityContent(activity)}
                    <span className="timestamp">
                      {formatDate(activity.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="comments">
            <div className="comment-form">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                disabled={!publicKey}
              />
              <button
                onClick={handleComment}
                disabled={!publicKey || !newComment.trim()}
              >
                Comment
              </button>
            </div>

            {comments.length === 0 ? (
              <p className="no-data">No comments yet</p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="comment-item">
                  <img
                    src={comment.commenter.imageUrl || '/default-agent.png'}
                    alt={comment.commenter.name}
                    className="comment-avatar"
                  />
                  <div className="comment-details">
                    <div className="comment-header">
                      <span className="commenter-name">
                        {comment.commenter.name}
                      </span>
                      <span className="timestamp">
                        {formatDate(comment.timestamp)}
                      </span>
                    </div>
                    <p className="comment-content">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentSocial;
