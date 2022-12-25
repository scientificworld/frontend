import classNames from 'classnames';
import { unescape } from 'lodash-es';
import type { BasicReply } from 'packages/client/client';
import type { FC } from 'react';
import React, { useState, memo, useCallback } from 'react';

import { State } from '@bangumi/client/topic';
import type { SubReply, Reply, User } from '@bangumi/client/topic';
import { Friend, OriginalPoster, TopicClosed, TopicSilent, TopicReopen } from '@bangumi/icons';
import { render as renderBBCode } from '@bangumi/utils';
import { getUserProfileLink } from '@bangumi/utils/pages';

import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import RichContent from '../../components/RichContent';
import Typography from '../../components/Typography';
import CommentInfo from './CommentInfo';
import ReplyForm from './ReplyForm';

export type CommentProps = ((SubReply & { isReply: true }) | (Reply & { isReply: false })) & {
  topicId: number;
  floor: string | number;
  originalPosterId: number;
  onReplySuccess: () => Promise<unknown>;
  user?: User;
};

const Link = Typography.Link;

const RenderContent = memo(({ state, text }: { state: State; text: string }) => {
  switch (state) {
    case State.Normal:
      return <RichContent html={renderBBCode(text)} classname='bgm-comment__content' />;
    case State.Closed:
      return <div className='bgm-comment__content'>关闭了该主题</div>;
    case State.Reopen:
      return <div className='bgm-comment__content'>重新开启了该主题</div>;
    case State.Silent:
      return <div className='bgm-comment__content'>下沉了该主题</div>;
    case State.DeletedByUser:
      return <div className='bgm-comment__content--deleted'>内容已被用户删除</div>;
    case State.DeletedByAdmin:
      return (
        <div className='bgm-comment__content--deleted'>
          内容因违反「
          <Link to='https://bgm.tv/about/guideline' isExternal>
            社区指导原则
          </Link>
          」已被删除
        </div>
      );
    default:
      return null;
  }
});

const Comment: FC<CommentProps> = ({
  text,
  creator,
  createdAt,
  floor,
  isFriend,
  originalPosterId,
  state,
  user,
  topicId,
  onReplySuccess,
  ...props
}) => {
  const isReply = props.isReply;
  const isDeleted = state === State.DeletedByUser || state === State.DeletedByAdmin;
  // 1 关闭 2 重开 5 下沉
  const isSpecial = state === State.Closed || state === State.Reopen || state === State.Silent;
  const replies = !isReply ? props.replies : null;
  const [shouldCollapsed, setShouldCollapsed] = useState(
    isSpecial || (isReply && (/[+-]\d+$/.test(text) || isDeleted)),
  );
  const [showReplyEditor, setShowReplyEditor] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const headerClassName = classNames('bgm-comment__header', {
    'bgm-comment__header--reply': isReply,
    'bgm-comment__header--collapsed': shouldCollapsed,
  });

  const url = getUserProfileLink(creator.username);

  const startReply = useCallback(() => {
    setShowReplyEditor(true);
    setReplyContent(isReply ? `[quote]${text.slice(0, 30)}[/quote]\n` : '');
  }, [isReply, text]);

  if (shouldCollapsed) {
    let icon = null;
    switch (state) {
      case State.Normal:
        icon = null;
        break;
      case State.Closed:
        icon = <TopicClosed />;
        break;
      case State.Reopen:
        icon = <TopicReopen />;
        break;
      case State.Silent:
        icon = <TopicSilent />;
        break;
    }

    return (
      <div
        className={headerClassName}
        onClick={isSpecial ? undefined : () => setShouldCollapsed(false)}
        id={`post_${props.id}`}
      >
        <span className='bgm-comment__tip'>
          <div className='creator-info'>
            {icon}
            <Link to={url} isExternal>
              {creator.nickname}
            </Link>
            <RenderContent state={state} text={text} />
          </div>
          <CommentInfo createdAt={createdAt} floor={floor} isSpecial={isSpecial} />
        </span>
      </div>
    );
  }

  const handleReplySuccess = async (reply: BasicReply) => {
    // 刷新回复列表
    await onReplySuccess();
    document.getElementById(`post_${reply.id}`)?.scrollIntoView({ block: 'center' });
    setShowReplyEditor(false);
  };

  return (
    <div>
      <div className={headerClassName} id={`post_${props.id}`}>
        <Avatar
          src={isReply ? creator.avatar.medium : creator.avatar.large}
          size={isReply ? 'small' : 'medium'}
        />
        <div className='bgm-comment__box'>
          <div className='bgm-comment__main'>
            <span className='bgm-comment__tip'>
              <div className='creator-info'>
                <Link to={url} isExternal>
                  {creator.nickname}
                </Link>
                {originalPosterId === creator.id ? <OriginalPoster /> : null}
                {isFriend ? <Friend /> : null}
                {!isReply && creator.sign ? <span>{`// ${unescape(creator.sign)}`}</span> : null}
              </div>
              <CommentInfo createdAt={createdAt} floor={floor} id={`post_${props.id}`} />
            </span>
            <RenderContent state={state} text={text} />
          </div>
          {user ? (
            <div className='bgm-comment__opinions'>
              {showReplyEditor ? (
                <ReplyForm
                  autoFocus
                  topicId={topicId}
                  replyTo={props.id}
                  placeholder={`回复 @${creator.nickname}：`}
                  content={replyContent}
                  onChange={setReplyContent}
                  onCancel={() => setShowReplyEditor(false)}
                  onSuccess={handleReplySuccess}
                />
              ) : (
                <>
                  <Button type='secondary' shape='rounded' onClick={startReply}>
                    回复
                  </Button>
                  <Button type='secondary' shape='rounded'>
                    +1
                  </Button>
                  {user.id === creator.id ? (
                    <>
                      {/* TODO */}
                      <Button type='text'>编辑</Button>
                      <Button type='text'>删除</Button>
                    </>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
      {replies?.map((reply, idx) => (
        <Comment
          topicId={topicId}
          key={reply.id}
          isReply
          onReplySuccess={onReplySuccess}
          floor={`${floor}-${idx + 1}`}
          originalPosterId={originalPosterId}
          user={user}
          {...reply}
        />
      ))}
    </div>
  );
};

export default memo(Comment);
