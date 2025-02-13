import type { BasicReply } from 'packages/client/client';
import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Avatar, Button, Layout, RichContent, Topic } from '@bangumi/design';
import ReplyForm from '@bangumi/design/components/Topic/ReplyForm';
import { useGroup } from '@bangumi/website/hooks/use-group';
import useGroupTopic from '@bangumi/website/hooks/use-group-topic';
import { useUser } from '@bangumi/website/hooks/use-user';

import GroupInfo from '../../components/GroupInfo';
import GroupNavigation from '../../components/GroupNavigation';
import GroupTopicHeader from './components/GroupTopicHeader';
import styles from './index.module.less';

const { Comment } = Topic;

const TopicPage: FC = () => {
  const { id } = useParams();
  if (!id || Number.isNaN(Number(id))) {
    throw new Error('BUG: topic id is required');
  }

  const { data: topicDetail, mutate } = useGroupTopic(Number(id));
  const { user } = useUser();
  const originalPosterId = topicDetail.creator.id;
  const isClosed = topicDetail.state === 1;
  const { group } = topicDetail;
  const { group: groupProfile } = useGroup(group.name);

  const [replyContent, setReplyContent] = useState('');

  const navigate = useNavigate();

  // 首次渲染时评论列表可能还没加载完，浏览器无法定位，所以需要在评论加载完后再滚动到指定位置
  useEffect(() => {
    const anchor = window.location.hash.slice(1);
    document.getElementById(anchor)?.scrollIntoView(true);
  }, [topicDetail]);

  const handleReplySuccess = async (reply: BasicReply) => {
    navigate(`#post_${reply.id}`);
    // 刷新评论列表
    await mutate();
    setReplyContent('');
  };

  const startReply = () => {
    const replyForm = document.getElementById('replyForm');
    replyForm?.scrollIntoView(true);
    replyForm?.querySelector('textarea')?.focus();
  };

  return (
    <>
      <GroupTopicHeader
        id={topicDetail.id}
        title={topicDetail.title}
        creator={topicDetail.creator}
        createdAt={topicDetail.createdAt}
        group={topicDetail.group}
      />
      <Layout
        type='alpha'
        leftChildren={
          <>
            {/* Topic content */}
            <div id={`post_${topicDetail.id}`}>
              <RichContent bbcode={topicDetail.text} />
              {user && (
                <div className={styles.topicActions}>
                  <Button type='secondary' size='small' onClick={startReply}>
                    回复
                  </Button>
                  {user.id === topicDetail.creator.id && (
                    <>
                      <Button.Link type='text' size='small' to={`/group/topic/${id}/edit`}>
                        编辑
                      </Button.Link>
                      <Button type='text' size='small'>
                        删除
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
            {/* Topic Comments */}
            <div className={styles.replies}>
              {topicDetail.replies.map((comment, idx) => (
                <Comment
                  topicId={topicDetail.id}
                  key={comment.id}
                  isReply={false}
                  floor={idx + 2}
                  originalPosterId={originalPosterId}
                  user={user}
                  onReplySuccess={mutate}
                  {...comment}
                />
              ))}
              {/* Reply BBCode Editor */}
              {!isClosed && user && (
                <div className={styles.replyFormContainer} id='replyForm'>
                  <Avatar src={user.avatar.large} size='medium' />
                  <ReplyForm
                    topicId={topicDetail.id}
                    className={styles.replyForm}
                    content={replyContent}
                    onChange={setReplyContent}
                    onSuccess={handleReplySuccess}
                    hideCancel
                  />
                </div>
              )}
            </div>
          </>
        }
        rightChildren={
          <>
            {user && <GroupNavigation group={groupProfile} />}
            <GroupInfo group={group} />
          </>
        }
      />
    </>
  );
};
export default TopicPage;
