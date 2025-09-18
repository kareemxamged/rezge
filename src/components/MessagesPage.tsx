import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ToastContainer';
import { messageService, reportService, blockService, deleteService, supabase } from '../lib/supabase';
import { useUserPresence, useUserStatus, useTypingStatus, useUserStatusText, useMultipleUserStatus } from '../hooks/useUserPresence';
import ConfirmModal from './ConfirmModal';
import VerificationBadge from './VerificationBadge';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import {
  Send,
  Search,
  MoreVertical,
  Shield,
  Users,
  Clock,
  CheckCircle,
  User,
  XCircle,
  UserX,
  Flag,
  Trash2,
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronDown
} from 'lucide-react';

// Types for conversations and messages
interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  status?: string;
  family_involved?: boolean;
  family_email?: string;
  last_message?: string;
  last_message_at?: string;
  last_message_sender_id?: string;
  last_message_read?: boolean;
  unread_count?: number;
  user1_typing?: boolean;
  user2_typing?: boolean;
  user1_last_typing_at?: string;
  user2_last_typing_at?: string;
  created_at: string;
  updated_at: string;
  user1?: {
    id: string;
    first_name: string;
    last_name: string;
    verified?: boolean;
  };
  user2?: {
    id: string;
    first_name: string;
    last_name: string;
    verified?: boolean;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  moderation_status: 'pending' | 'approved' | 'rejected';
  read_at?: string;
  created_at: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

const MessagesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { userProfile } = useAuth();
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFamilyInvite, setShowFamilyInvite] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [familyEmail, setFamilyEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showChatView, setShowChatView] = useState(false); // For mobile/tablet view

  // Scroll states and refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Modal states
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // User presence and typing status hooks
  const { isInitialized: presenceInitialized } = useUserPresence();
  const { formatUserStatus } = useUserStatusText();

  // Get the other user in the conversation (moved up to avoid hoisting issues)
  const getOtherUser = useCallback((conversation: Conversation | null) => {
    if (!userProfile?.id || !conversation) return null;
    return conversation.user1_id === userProfile.id ? conversation.user2 : conversation.user1;
  }, [userProfile?.id]);

  // Get other user's status for active conversation
  const otherUser = activeConversation ? getOtherUser(activeConversation) : null;
  const { userStatus: otherUserStatus } = useUserStatus(otherUser?.id || null);

  // Typing status for active conversation
  const { isTyping, otherUserTyping, startTyping, stopTyping } = useTypingStatus(activeConversation?.id || null);

  // Get user IDs from conversations for status tracking
  const conversationUserIds = useMemo(() => {
    return conversations
      .map(conversation => getOtherUser(conversation)?.id)
      .filter((id): id is string => !!id);
  }, [conversations, getOtherUser]);

  // Track status of all users in conversations list
  const { userStatuses } = useMultipleUserStatus(conversationUserIds);

  // Debug logging
  console.log('MessagesPage rendered, showMoreMenu:', showMoreMenu, 'activeConversation:', activeConversation?.id);

  // Scroll to bottom function with enhanced smoothness
  const scrollToBottom = (smooth = true, duration = 800) => {
    if (messagesContainerRef.current) {
      if (smooth) {
        // Enhanced smooth scrolling with custom animation
        const container = messagesContainerRef.current;
        const startPosition = container.scrollTop;
        const targetPosition = container.scrollHeight - container.clientHeight;
        const distance = targetPosition - startPosition;
        const startTime = performance.now();

        const animateScroll = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Easing function for smoother animation (ease-out-cubic)
          const easeOutCubic = 1 - Math.pow(1 - progress, 3);

          container.scrollTop = startPosition + (distance * easeOutCubic);

          if (progress < 1) {
            requestAnimationFrame(animateScroll);
          }
        };

        requestAnimationFrame(animateScroll);
      } else {
        // Instant scroll
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'auto'
        });
      }
    }
  };



  // Handle scroll position monitoring
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;

    // Check if user is at the bottom (within 50px threshold)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;

    // Show scroll to bottom button when not at bottom and there are messages
    setShowScrollToBottom(!isNearBottom && messages.length > 0);
  };

  // Load conversations when component mounts
  useEffect(() => {
    if (userProfile?.id) {
      loadConversations();
    }
  }, [userProfile]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation?.id) {
      loadMessages(activeConversation.id);
    }
  }, [activeConversation]);

  // Real-time subscription for message updates (read status changes)
  useEffect(() => {
    if (!activeConversation?.id || !userProfile?.id) return;

    console.log('🔔 Setting up real-time subscription for conversation:', activeConversation.id);

    const subscription = supabase
      .channel(`messages-${activeConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation.id}`
        },
        (payload) => {
          console.log('🔔 Real-time message update received:', payload);

          // Update the specific message in local state
          if (payload.new && payload.new.id) {
            setMessages(prevMessages =>
              prevMessages.map(msg =>
                msg.id === payload.new.id
                  ? { ...msg, read_at: payload.new.read_at, updated_at: payload.new.updated_at }
                  : msg
              )
            );

            // Also update conversations list if this is the last message
            setConversations(prevConversations =>
              prevConversations.map(conv =>
                conv.id === activeConversation.id && conv.last_message_sender_id === userProfile.id
                  ? { ...conv, last_message_read: !!payload.new.read_at }
                  : conv
              )
            );

            console.log('✅ Updated message read status in real-time:', {
              messageId: payload.new.id,
              read_at: payload.new.read_at
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔔 Cleaning up real-time subscription for conversation:', activeConversation.id);
      subscription.unsubscribe();
    };
  }, [activeConversation?.id, userProfile?.id]);

  // Polling for message read status updates and conversation list updates (backup for real-time)
  useEffect(() => {
    if (!userProfile?.id) return;

    const pollForUpdates = async () => {
      try {
        // Update messages if we have an active conversation
        if (activeConversation?.id) {
          const { data: updatedMessages, error } = await messageService.getMessages(activeConversation.id);
          if (!error && updatedMessages) {
            const transformedMessages = updatedMessages.map((msg: any) => ({
              ...msg,
              sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender
            }));

            // Check if any read_at status changed
            setMessages(prevMessages => {
              const hasChanges = prevMessages.some(prevMsg => {
                const updatedMsg = transformedMessages.find(msg => msg.id === prevMsg.id);
                return updatedMsg && prevMsg.read_at !== updatedMsg.read_at;
              });

              if (hasChanges) {
                console.log('🔄 Polling detected read status changes, updating messages');
                return transformedMessages;
              }
              return prevMessages;
            });
          }
        }

        // Update conversations list to refresh unread counts
        const { data: updatedConversations, error: convError } = await messageService.getConversations(userProfile.id);
        if (!convError && updatedConversations) {
          setConversations(prevConversations => {
            // Check if unread counts changed
            const hasUnreadChanges = prevConversations.some(prevConv => {
              const updatedConv = updatedConversations.find(conv => conv.id === prevConv.id);
              return updatedConv && prevConv.unread_count !== updatedConv.unread_count;
            });

            if (hasUnreadChanges) {
              console.log('🔄 Polling detected unread count changes, updating conversations');
              return updatedConversations;
            }
            return prevConversations;
          });
        }
      } catch (error) {
        console.warn('⚠️ Error polling for updates:', error);
      }
    };

    // Poll every 10 seconds (less frequent for conversations)
    const interval = setInterval(pollForUpdates, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [activeConversation?.id, userProfile?.id]);

  // Auto scroll to bottom ONLY when messages are actually loaded
  useEffect(() => {
    // Only scroll if we have messages AND we're not currently loading
    if (messages.length > 0 && activeConversation?.id && !isLoadingMessages) {
      console.log('📜 Messages fully loaded, scrolling to bottom. Messages count:', messages.length);

      // Wait for DOM to be fully rendered
      const scrollToBottomAfterRender = () => {
        // Use multiple requestAnimationFrame to ensure all rendering is complete
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const container = messagesContainerRef.current;
              if (container) {
                const beforeScroll = {
                  scrollTop: container.scrollTop,
                  scrollHeight: container.scrollHeight,
                  clientHeight: container.clientHeight
                };

                // Force scroll to bottom
                container.scrollTop = container.scrollHeight;

                const afterScroll = {
                  scrollTop: container.scrollTop,
                  scrollHeight: container.scrollHeight,
                  clientHeight: container.clientHeight
                };

                console.log('📊 Auto-scroll after messages load:');
                console.log('   Before:', beforeScroll);
                console.log('   After:', afterScroll);
                console.log('   Success:', afterScroll.scrollTop > beforeScroll.scrollTop);

                // If scroll didn't work, try again
                if (afterScroll.scrollTop === beforeScroll.scrollTop && afterScroll.scrollHeight > afterScroll.clientHeight) {
                  console.log('🔄 Retrying scroll...');
                  setTimeout(() => {
                    container.scrollTop = container.scrollHeight;
                  }, 100);
                }
              }
            });
          });
        });
      };

      // Execute scroll
      scrollToBottomAfterRender();
    }
  }, [messages.length, activeConversation?.id, isLoadingMessages]); // Include isLoadingMessages in dependencies

  // Add scroll event listener to messages container
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [messages.length]);

  // Additional effect to scroll when loading finishes
  useEffect(() => {
    // When loading finishes and we have messages, scroll to bottom
    if (!isLoadingMessages && messages.length > 0 && activeConversation?.id) {
      console.log('🎯 Loading finished, scrolling to bottom now...');

      // Wait a bit for the DOM to update
      setTimeout(() => {
        const container = messagesContainerRef.current;
        if (container) {
          const beforeScroll = {
            scrollTop: container.scrollTop,
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight
          };

          container.scrollTop = container.scrollHeight;

          const afterScroll = {
            scrollTop: container.scrollTop,
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight
          };

          console.log('📊 Post-loading scroll:');
          console.log('   Before:', beforeScroll);
          console.log('   After:', afterScroll);
          console.log('   Success:', afterScroll.scrollTop !== beforeScroll.scrollTop);
        }
      }, 100);
    }
  }, [isLoadingMessages, messages.length, activeConversation?.id]);



  // Final effect to ensure scrolling after everything is rendered
  useEffect(() => {
    if (messages.length > 0 && activeConversation?.id && messagesContainerRef.current) {
      // Use IntersectionObserver to detect when the last message is rendered
      const lastMessageElement = messagesContainerRef.current.lastElementChild;
      if (lastMessageElement) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Last message is visible, but let's still scroll to ensure we're at the bottom
              setTimeout(() => {
                const container = messagesContainerRef.current;
                if (container) {
                  container.scrollTop = container.scrollHeight;
                  console.log('🎯 Final scroll after last message is visible');
                }
              }, 50);
              observer.disconnect();
            }
          });
        });

        observer.observe(lastMessageElement);

        // Cleanup
        return () => observer.disconnect();
      }
    }
  }, [messages, activeConversation?.id]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showMoreMenu && !target.closest('.more-menu-container')) {
        setShowMoreMenu(false);
      }
    };

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreMenu]);

  const loadConversations = async () => {
    if (!userProfile?.id) return;

    setIsLoading(true);
    try {
      console.log('Loading conversations for user:', userProfile.id);
      const { data, error } = await messageService.getConversations(userProfile.id);

      if (error) {
        console.error('Error loading conversations:', error);
        showError(t('messages.errors.loadingError'), t('messages.errors.loadingConversationsError'));
        return;
      }

      console.log('Loaded conversations:', data);

      // Transform the data to match our interface
      const transformedData = (data || []).map((conv: any) => ({
        ...conv,
        user1: Array.isArray(conv.user1) ? conv.user1[0] : conv.user1,
        user2: Array.isArray(conv.user2) ? conv.user2[0] : conv.user2
      }));

      setConversations(transformedData);

      // Don't automatically select any conversation - let user choose
      // Only clear active conversation if no conversations exist
      if (transformedData && transformedData.length === 0) {
        // If no conversations exist, clear the active conversation
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Unexpected error loading conversations:', error);
      showError(t('messages.errors.unexpectedError'), t('messages.errors.unexpectedLoadingError'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      console.log('Loading messages for conversation:', conversationId);
      const { data, error } = await messageService.getMessages(conversationId);

      if (error) {
        console.error('Error loading messages:', error);
        showError(t('messages.errors.loadingError'), t('messages.errors.loadingMessagesError'));
        return;
      }

      console.log('Loaded messages:', data);

      // Transform the data to match our interface
      const transformedMessages = (data || []).map((msg: any) => ({
        ...msg,
        sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender
      }));

      // Debug: Log read_at status for messages
      console.log('Messages read_at status:', transformedMessages.map(msg => ({
        id: msg.id,
        sender_id: msg.sender_id,
        read_at: msg.read_at,
        isMyMessage: msg.sender_id === userProfile?.id
      })));

      setMessages(transformedMessages);

      // تحديث حالة قراءة الرسائل
      if (userProfile?.id) {
        const currentTime = new Date().toISOString();

        // تحديث حالة قراءة الرسائل في المحادثة المحلية فوراً
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.sender_id !== userProfile.id && !msg.read_at
              ? { ...msg, read_at: currentTime }
              : msg
          )
        );

        // استخدام الدالة المحسنة في قاعدة البيانات مباشرة
        console.log('🔄 Using enhanced RPC method for marking messages as read...');
        const rpcResult = await messageService.markMessagesAsReadRPC(conversationId, userProfile.id);

        if (rpcResult.success) {
          console.log('✅ RPC method succeeded, updated:', rpcResult.updatedCount, 'messages');
        } else {
          console.warn('⚠️ RPC method failed, trying regular method...');
          const markResult = await messageService.markMessagesAsRead(conversationId, userProfile.id);
          if (!markResult.success) {
            console.warn('⚠️ Both methods failed to update database, relying on local update only');
          }
        }

        // تحديث حالة قراءة الرسالة الأخيرة وإعادة تعيين عداد الرسائل غير المقروءة
        // (نفعل هذا بغض النظر عن نجاح تحديث قاعدة البيانات)
        setConversations(prevConversations =>
          prevConversations.map(conv =>
            conv.id === conversationId
              ? {
                  ...conv,
                  last_message_read: conv.last_message_sender_id !== userProfile.id ? true : conv.last_message_read,
                  unread_count: 0 // إعادة تعيين العداد إلى صفر عند قراءة الرسائل
                }
              : conv
          )
        );

        // إعادة جلب الرسائل من قاعدة البيانات للحصول على read_at المحدث (في الخلفية)
        try {
          const { data: updatedMessages, error: refreshError } = await messageService.getMessages(conversationId);
          if (!refreshError && updatedMessages) {
            const refreshedMessages = updatedMessages.map((msg: any) => ({
              ...msg,
              sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender
            }));

            console.log('Refreshed messages after marking as read:', refreshedMessages.map(msg => ({
              id: msg.id,
              sender_id: msg.sender_id,
              read_at: msg.read_at,
              isMyMessage: msg.sender_id === userProfile.id
            })));

            setMessages(refreshedMessages);
          }
        } catch (refreshError) {
          console.warn('Error refreshing messages after marking as read:', refreshError);
        }
      }
    } catch (error) {
      console.error('Unexpected error loading messages:', error);
      showError(t('messages.errors.unexpectedError'), t('messages.errors.unexpectedMessagesError'));
    } finally {
      setIsLoadingMessages(false);
      console.log('✅ Finished loading messages, isLoadingMessages set to false');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation?.id || !userProfile?.id) return;

    try {
      console.log('Sending message:', {
        conversationId: activeConversation.id,
        senderId: userProfile.id,
        content: newMessage.trim()
      });

      const { data, error } = await messageService.sendMessage(
        activeConversation.id,
        userProfile.id,
        newMessage.trim()
      );

      if (error) {
        console.error('Error sending message:', error);
        showError(t('messages.errors.sendingError'), t('messages.errors.sendingErrorDesc'));
        return;
      }

      console.log('Message sent successfully:', data);

      // Add the new message to the local state
      if (data) {
        const newMessageObj: Message = {
          ...data,
          sender: {
            id: userProfile.id,
            first_name: userProfile.first_name || '',
            last_name: userProfile.last_name || ''
          }
        };
        setMessages(prev => [...prev, newMessageObj]);

        // Update the conversation's last message in the conversations list
        setConversations(prevConversations =>
          prevConversations.map(conv =>
            conv.id === activeConversation.id
              ? {
                  ...conv,
                  last_message: newMessage.trim(),
                  last_message_at: new Date().toISOString(),
                  last_message_sender_id: userProfile.id,
                  last_message_read: false // الرسالة الجديدة لم تُقرأ بعد من قبل المستقبل
                }
              : conv
          )
        );

        // إزالة الإشعار عند إرسال رسالة جديدة
        // showSuccess(t('messages.success.messageSent'), t('messages.success.messageSentDesc'));

        // Auto scroll to bottom after sending message with enhanced smoothness
        setTimeout(() => {
          scrollToBottom(true, 600); // Smooth scroll with 600ms duration
        }, 100);
      }

      setNewMessage('');

      // Stop typing status after sending message
      if (isTyping) {
        stopTyping();
      }
    } catch (error) {
      console.error('Unexpected error sending message:', error);
      showError(t('messages.errors.unexpectedError'), t('messages.errors.unexpectedSendingError'));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle typing status
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // Start typing if user is typing and not already marked as typing
    if (value.trim() && !isTyping) {
      startTyping();
    }
    // Stop typing if user cleared the message
    else if (!value.trim() && isTyping) {
      stopTyping();
    }
  };



  // Get the other user's full name
  const getOtherUserName = (conversation: Conversation | null) => {
    if (!conversation || !userProfile?.id) {
      return i18n.language === 'ar' ? 'هذا المستخدم' : 'this user';
    }

    // Determine which user is the "other" user
    let otherUser = null;

    if (conversation.user1_id === userProfile.id) {
      otherUser = conversation.user2;
    } else if (conversation.user2_id === userProfile.id) {
      otherUser = conversation.user1;
    }

    if (!otherUser) {
      return i18n.language === 'ar' ? 'هذا المستخدم' : 'this user';
    }

    // Handle case where user data might be an array (from Supabase join)
    const userData = Array.isArray(otherUser) ? otherUser[0] : otherUser;

    if (!userData) {
      return i18n.language === 'ar' ? 'هذا المستخدم' : 'this user';
    }

    const firstName = userData.first_name || '';
    const lastName = userData.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || (i18n.language === 'ar' ? 'هذا المستخدم' : 'this user');
  };

  // Check if current user has blocked the other user
  const isUserBlocked = (conversation: Conversation | null): boolean => {
    if (!conversation || !userProfile) return false;
    // Check if conversation status is blocked
    return conversation.status === 'blocked';
  };

  // Check if other user's profile image should be hidden
  const shouldHideProfileImage = (conversation: Conversation | null): boolean => {
    if (!conversation || !userProfile) return false;
    // Hide profile image if user is blocked
    return conversation.status === 'blocked';
  };

  // Handle view profile
  const handleViewProfile = (userId: string) => {
    // Check if the user is blocked before allowing profile view
    if (activeConversation && isUserBlocked(activeConversation)) {
      showWarning(
        t('messages.warnings.profileBlocked'),
        t('messages.warnings.profileBlockedDesc')
      );
      return;
    }
    navigate(`/profile/${userId}`);
  };

  // Handle conversation selection (mobile/tablet)
  const handleConversationSelect = (conversation: Conversation) => {
    setActiveConversation(conversation);
    setShowChatView(true); // Show chat view on mobile/tablet
  };

  // Handle back to conversations list (mobile/tablet)
  const handleBackToConversations = () => {
    setShowChatView(false);
    setActiveConversation(null);
  };

  // Handle family involvement
  const handleFamilyInvite = async () => {
    if (!familyEmail.trim()) {
      showWarning(t('messages.errors.familyEmailRequired'), t('messages.errors.familyEmailRequiredDesc'));
      return;
    }

    if (!activeConversation?.id) {
      showError(t('messages.errors.noActiveConversation'), t('messages.errors.noActiveConversationDesc'));
      return;
    }

    try {
      // Update conversation to include family
      const { error } = await messageService.updateConversation(activeConversation.id, {
        family_involved: true,
        family_email: familyEmail.trim()
      });

      if (error) {
        console.error('Error involving family:', error);
        showError(t('messages.errors.familyInviteError'), t('messages.errors.familyInviteErrorDesc'));
        return;
      }

      // Send notification email to family (this would be implemented later)
      console.log('Family invited:', familyEmail);
      showSuccess(t('messages.success.familyInvited'), t('messages.success.familyInvitedDesc'));
      setShowFamilyInvite(false);
      setFamilyEmail('');
    } catch (error) {
      console.error('Unexpected error involving family:', error);
      showError(t('messages.errors.unexpectedError'), t('messages.errors.familyInviteErrorDesc'));
    }
  };

  // Handle blocking user
  const handleBlockUser = async () => {
    console.log('handleBlockUser called');
    if (!activeConversation?.id || !userProfile?.id) {
      showError(t('messages.errors.noActiveConversation'), t('messages.errors.noActiveConversationDesc'));
      return;
    }

    const otherUser = getOtherUser(activeConversation);
    if (!otherUser) {
      showError(t('messages.errors.noUserData'), t('messages.errors.noUserDataDesc'));
      return;
    }

    try {
      console.log('Blocking conversation:', activeConversation.id);

      // Show processing notification
      showInfo(t('messages.info.processing'), t('messages.info.blockingInProgress'));

      const { success, error } = await blockService.blockUserInConversation(
        activeConversation.id,
        userProfile.id,
        otherUser.id
      );

      if (!success || error) {
        console.error('Error blocking user:', error);
        showError(t('messages.errors.blockingError'), t('messages.errors.blockingErrorDesc'));
        return;
      }

      // Enhanced success notification with detailed information
      showSuccess(
        t('messages.success.userBlocked'),
        t('messages.success.userBlockedDesc', { name: `${otherUser.first_name} ${otherUser.last_name}` })
      );

      setShowBlockModal(false);
      setShowMoreMenu(false);

      // Update the active conversation status locally for immediate UI update
      if (activeConversation) {
        const updatedConversation = {
          ...activeConversation,
          status: 'blocked'
        };
        setActiveConversation(updatedConversation);

        // Also update the conversation in the conversations list
        setConversations(prevConversations =>
          prevConversations.map(conv =>
            conv.id === activeConversation.id
              ? updatedConversation
              : conv
          )
        );
      }
    } catch (error) {
      console.error('Unexpected error blocking user:', error);
      showError(t('messages.errors.unexpectedError'), t('messages.errors.blockingErrorDesc'));
    }
  };

  // Handle unblocking user
  const handleUnblockUser = async () => {
    console.log('handleUnblockUser called');
    if (!activeConversation?.id || !userProfile?.id) {
      showError(t('messages.errors.noActiveConversation'), t('messages.errors.noActiveConversationDesc'));
      return;
    }

    const otherUser = getOtherUser(activeConversation);
    if (!otherUser) {
      showError(t('messages.errors.noUserData'), t('messages.errors.noUserDataDesc'));
      return;
    }

    try {
      console.log('Unblocking conversation:', activeConversation.id);

      // Show processing notification
      showInfo(t('messages.info.processing'), t('messages.info.unblockingInProgress'));

      const { success, error } = await blockService.unblockUserInConversation(activeConversation.id);

      if (!success || error) {
        console.error('Error unblocking user:', error);
        showError(t('messages.errors.unblockingError'), t('messages.errors.unblockingErrorDesc'));
        return;
      }

      // Enhanced success notification
      showSuccess(
        t('messages.success.userUnblocked'),
        t('messages.success.userUnblockedDesc', { name: `${otherUser.first_name} ${otherUser.last_name}` })
      );

      setShowUnblockModal(false);
      setShowMoreMenu(false);

      // Update the active conversation status locally for immediate UI update
      if (activeConversation) {
        const updatedConversation = {
          ...activeConversation,
          status: 'active'
        };
        setActiveConversation(updatedConversation);

        // Also update the conversation in the conversations list
        setConversations(prevConversations =>
          prevConversations.map(conv =>
            conv.id === activeConversation.id
              ? updatedConversation
              : conv
          )
        );
      }
    } catch (error) {
      console.error('Unexpected error unblocking user:', error);
      showError(t('messages.errors.unexpectedError'), t('messages.errors.unblockingErrorDesc'));
    }
  };

  // Handle reporting user
  const handleReportUser = async (reason: string) => {
    console.log('🚩 handleReportUser called with reason:', reason);

    // Validate conversation and user
    if (!activeConversation || !userProfile?.id) {
      console.error('❌ No active conversation or user not logged in');
      showError(t('messages.errors.noActiveConversation'), t('messages.errors.noActiveConversationDesc'));
      return;
    }

    const otherUser = getOtherUser(activeConversation);
    if (!otherUser) {
      console.error('❌ Cannot find other user data');
      showError(t('messages.errors.noUserData'), t('messages.errors.noUserDataDesc'));
      return;
    }

    // Validate reason
    if (!reason?.trim()) {
      showError(t('messages.errors.reportReasonRequired'), t('messages.errors.reportReasonRequiredDesc'));
      return;
    }

    if (reason.trim().length < 10) {
      showError(t('messages.errors.reportReasonTooShort'), t('messages.errors.reportReasonTooShortDesc'));
      return;
    }

    // Show processing message
    showInfo(t('messages.info.processing'), t('messages.info.reportingInProgress'));

    try {
      const { data, error } = await reportService.createReport(
        otherUser.id,
        userProfile.id,
        'inappropriate_behavior',
        reason.trim(),
        'medium'
      );

      if (error) {
        console.error('❌ Error creating report:', error);

        // Show specific error messages based on error content
        if (error.includes('24 ساعة') || error.includes('24 hours')) {
          showWarning(t('messages.warnings.reportAlreadyExists'), t('messages.warnings.reportLimitReached'));
        } else if (error.includes('معاملات غير صحيحة') || error.includes('invalid')) {
          showError(t('messages.errors.reportInvalidData'), t('messages.errors.reportInvalidDataDesc'));
        } else if (error.includes('لا يمكن للمستخدم الإبلاغ عن نفسه') || error.includes('cannot report yourself')) {
          showError(t('messages.errors.reportSelfError'), t('messages.errors.reportSelfErrorDesc'));
        } else {
          showError(t('messages.errors.reportingError'), error || t('messages.errors.reportingErrorDesc'));
        }
        return;
      }

      if (!data) {
        console.error('❌ No data returned from report creation');
        showError(t('messages.errors.reportingError'), t('messages.errors.reportingErrorDesc'));
        return;
      }

      console.log('✅ Report created successfully:', data);

      // Show success message with report details
      const reportId = data.id || (i18n.language === 'ar' ? 'غير محدد' : 'N/A');
      showSuccess(
        t('messages.success.reportSent'),
        t('messages.success.reportSentDesc', { reportId })
      );

      // Close modal
      setShowReportModal(false);
      setShowMoreMenu(false);
    } catch (error) {
      console.error('💥 Unexpected error reporting user:', error);
      showError(t('messages.errors.unexpectedError'), t('messages.errors.reportingErrorDesc'));
    }
  };

  // Handle deleting conversation
  const handleDeleteConversation = async () => {
    console.log('🗑️ handleDeleteConversation called');
    if (!activeConversation?.id || !userProfile?.id) {
      console.error('❌ No active conversation or user profile');
      showError(t('messages.errors.noActiveConversation'), t('messages.errors.noActiveConversationDesc'));
      return;
    }

    try {
      console.log('🗑️ Deleting conversation:', activeConversation.id);
      console.log('👤 Current user:', userProfile.id);

      const result = await deleteService.deleteConversationCompletely(activeConversation.id);
      console.log('🔄 Delete result:', result);

      if (!result.success || result.error) {
        console.error('❌ Error deleting conversation:', result.error);
        showError(t('messages.errors.deleteError'), t('messages.errors.deleteErrorDesc'));
        return;
      }

      console.log('✅ Conversation deleted successfully');
      showSuccess(t('messages.success.conversationDeleted'), t('messages.success.conversationDeletedDesc'));

      // Remove the deleted conversation from the local state immediately
      console.log('🧹 Removing conversation from local state');
      const deletedConversationId = activeConversation.id;
      setConversations(prevConversations =>
        prevConversations.filter(conv => conv.id !== deletedConversationId)
      );

      // Clear the active conversation and messages immediately
      console.log('🧹 Clearing active conversation and messages');
      setActiveConversation(null);
      setMessages([]);
      setShowDeleteModal(false);
      setShowMoreMenu(false);

      console.log('✅ Conversation removed from UI successfully');
    } catch (error) {
      console.error('💥 Unexpected error deleting conversation:', error);
      showError(t('messages.errors.unexpectedError'), t('messages.errors.deleteErrorDesc'));
    }
  };

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conversation => {
    const otherUser = getOtherUser(conversation);
    if (!otherUser) return false;
    const fullName = `${otherUser.first_name} ${otherUser.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return t('messages.minutesAgo');
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} ${t('messages.hoursAgo')}`;
    } else {
      const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        calendar: 'gregory'
      });
    }
  };

  const getStatusIcon = (message: any) => {
    // For moderation status
    switch (message.moderation_status) {
      case 'approved':
        // Show delivery status for approved messages
        return getDeliveryStatusIcon(message);
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getDeliveryStatusIcon = (message: any) => {
    // Debug logging
    console.log('getDeliveryStatusIcon for message:', {
      id: message.id,
      sender_id: message.sender_id,
      current_user_id: userProfile?.id,
      is_my_message: message.sender_id === userProfile?.id,
      delivery_status: message.delivery_status,
      moderation_status: message.moderation_status,
      read_at: message.read_at,
      hasReadAt: !!message.read_at,
      created_at: message.created_at
    });

    // حالة 1: الرسالة مرفوضة من المراجعة
    if (message.moderation_status === 'rejected') {
      // علامة صح واحدة رمادية - الرسالة مرفوضة
      return (
        <div title={t('messages.messageStatus.blocked')} className="flex items-center">
          <Check className="w-4 h-4 text-slate-400" />
        </div>
      );
    }

    // حالة 2: الرسالة وصلت وتم قراءتها
    // هذا يحدث عندما يدخل المستقبل للمحادثة ويرى الرسالة
    if (message.read_at && message.read_at !== null) {
      // علامتا صح زرقاوان - الرسالة وصلت وقُرئت
      console.log('✅ Showing BLUE checkmarks for read message:', message.id);
      return (
        <div title={t('messages.messageStatus.read')} className="flex items-center">
          <CheckCheck className="w-4 h-4 text-cyan-300" />
        </div>
      );
    }

    // حالة 3: الرسالة لم تصل للمستقبل (محظور)
    // هذا يحدث عندما يكون المرسل محظور من قبل المستقبل
    if (message.delivery_status === 'sent') {
      // علامة صح واحدة رمادية - الرسالة لم تصل
      return (
        <div title={t('messages.messageStatus.blocked')} className="flex items-center">
          <Check className="w-4 h-4 text-slate-400" />
        </div>
      );
    }

    // حالة 4: الرسالة وصلت لكن لم تُقرأ بعد (الحالة الافتراضية)
    // هذا يحدث عندما تصل الرسالة للمستقبل لكنه لم يدخل للمحادثة بعد
    // أو عندما delivery_status غير محدد (undefined) وهي الحالة الطبيعية للرسائل المعتمدة
    console.log('📋 Showing GRAY checkmarks for unread message:', message.id);
    return (
      <div title={t('messages.messageStatus.delivered')} className="flex items-center">
        <CheckCheck className="w-4 h-4 text-slate-400" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-emerald-50" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-10 md:top-20 right-10 md:right-20 w-32 h-32 md:w-64 md:h-64 bg-primary-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 md:bottom-20 left-10 md:left-20 w-48 h-48 md:w-96 md:h-96 bg-emerald-500 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 relative">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 mb-3 md:mb-4 font-display">
            {t('messages.messagesTitle')}
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-slate-600 px-4">
            {t('messages.subtitle')}
          </p>
        </div>

        {/* Messages Interface */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 h-[calc(100vh-120px)] min-h-[700px] max-h-[900px]">
            {/* Conversations Sidebar */}
            <div className={`lg:col-span-1 border-l border-slate-200 ${showChatView ? 'hidden lg:block' : 'block'}`}>
              {/* Header for mobile/tablet */}
              <div className="lg:hidden p-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-lg font-semibold text-slate-800">{t('messages.conversations')}</h2>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-slate-200">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('messages.searchConversations')}
                    className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Conversations List */}
              <div className="overflow-y-auto h-full">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                      <p className="text-slate-600">{t('messages.loadingConversations')}</p>
                    </div>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <User className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">{t('messages.noConversations')}</h3>
                    <p className="text-slate-600 mb-4">{t('messages.noConversationsDesc')}</p>
                    <Link
                      to="/search"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-emerald-600 text-white py-2 px-4 rounded-xl font-medium hover:from-primary-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <Search className="w-4 h-4" />
                      {t('messages.searchMembers')}
                    </Link>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const otherUser = getOtherUser(conversation);
                    if (!otherUser) return null;

                    return (
                      <div
                        key={conversation.id}
                        onClick={() => handleConversationSelect(conversation)}
                        className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 ${
                          activeConversation?.id === conversation.id ? 'bg-primary-50 border-primary-200' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="relative">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              shouldHideProfileImage(conversation)
                                ? 'bg-slate-400'
                                : 'bg-gradient-to-br from-primary-500 to-emerald-500'
                            }`}>
                              {shouldHideProfileImage(conversation) ? (
                                <UserX className="w-6 h-6 text-white" />
                              ) : (
                                <User className="w-6 h-6 text-white" />
                              )}
                            </div>

                            {/* Online status indicator - Green dot */}
                            <OnlineStatusIndicator
                              isOnline={userStatuses[otherUser.id]?.isOnline || false}
                              size="md"
                            />

                            {/* Blocked indicator */}
                            {conversation.status === 'blocked' && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                <UserX className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Conversation Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <h3
                                  className="font-medium text-slate-800 truncate cursor-pointer hover:text-primary-600 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewProfile(otherUser.id);
                                  }}
                                  title={t('messages.viewProfile')}
                                >
                                  {otherUser.first_name} {otherUser.last_name}
                                </h3>
                                <VerificationBadge
                                  isVerified={otherUser.verified || false}
                                  size="sm"
                                  className="scale-75"
                                />
                              </div>

                              {/* Unread messages count - positioned next to name */}
                              {(conversation.unread_count || 0) > 0 && (
                                <div className="bg-primary-600 text-white text-xs font-semibold px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                                  {(conversation.unread_count || 0) > 99 ? '99+' : (conversation.unread_count || 0)}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-slate-600 truncate flex-1">
                                {/* Show typing indicator if other user is typing */}
                                {(() => {
                                  const isOtherUserTyping = userProfile?.id === conversation.user1_id
                                    ? conversation.user2_typing
                                    : conversation.user1_typing;

                                  if (isOtherUserTyping) {
                                    return (
                                      <span className="text-primary-600 font-medium">
                                        {t('messages.userStatus.typing')}
                                      </span>
                                    );
                                  }

                                  // Show last message
                                  return conversation.last_message ? (
                                    <>
                                      {conversation.last_message_sender_id === userProfile?.id && (
                                        <span className="text-slate-500">{t('messages.you')}: </span>
                                      )}
                                      {conversation.last_message}
                                    </>
                                  ) : (
                                    t('messages.noMessagesYet')
                                  );
                                })()}
                              </p>
                              {/* Read status icons - positioned at the edge based on language direction */}
                              {conversation.last_message && conversation.last_message_sender_id === userProfile?.id && (
                                <div className={`flex-shrink-0 ${i18n.language === 'ar' ? 'ml-2' : 'mr-2'}`}>
                                  {conversation.last_message_read ? (
                                    <CheckCheck className="w-4 h-4 text-cyan-400" />
                                  ) : (
                                    <CheckCheck className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {conversation.last_message && conversation.last_message_at ?
                                formatTimestamp(conversation.last_message_at) :
                                formatTimestamp(conversation.created_at)
                              }
                            </p>
                          </div>

                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className={`lg:col-span-2 flex flex-col h-full overflow-hidden relative ${!showChatView ? 'hidden lg:flex' : 'flex'}`}>
              {!activeConversation ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <User className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">{t('messages.selectConversation')}</h3>
                    <p className="text-slate-600">{t('messages.selectConversationDesc')}</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="flex-shrink-0 p-4 border-b border-slate-200 bg-white/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Back button for mobile/tablet */}
                        <button
                          onClick={handleBackToConversations}
                          className="lg:hidden p-2 hover:bg-slate-100 rounded-full transition-colors"
                          title={t('messages.backToConversations')}
                        >
                          <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            shouldHideProfileImage(activeConversation)
                              ? 'bg-slate-400'
                              : 'bg-gradient-to-br from-primary-500 to-emerald-500'
                          }`}>
                            {shouldHideProfileImage(activeConversation) ? (
                              <UserX className="w-5 h-5 text-white" />
                            ) : (
                              <User className="w-5 h-5 text-white" />
                            )}
                          </div>

                          {/* Online status indicator - Green dot */}
                          <OnlineStatusIndicator
                            isOnline={otherUserStatus?.isOnline || false}
                            size="sm"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3
                              className="font-medium text-slate-800 cursor-pointer hover:text-primary-600 transition-colors"
                              onClick={() => {
                                const otherUser = getOtherUser(activeConversation);
                                if (otherUser) {
                                  handleViewProfile(otherUser.id);
                                }
                              }}
                              title={t('messages.viewProfile')}
                            >
                              {(() => {
                                const otherUser = getOtherUser(activeConversation);
                                return otherUser ? `${otherUser.first_name} ${otherUser.last_name}` : 'مستخدم';
                              })()}
                            </h3>
                            {(() => {
                              const otherUser = getOtherUser(activeConversation);
                              return otherUser?.verified && (
                                <VerificationBadge
                                  isVerified={true}
                                  size="sm"
                                  className="scale-75"
                                />
                              );
                            })()}
                          </div>
                          <p className="text-sm text-slate-600">
                            {otherUserTyping ? (
                              <span className="text-primary-600 font-medium">
                                {t('messages.userStatus.typing')}
                              </span>
                            ) : (
                              formatUserStatus(otherUserStatus, t)
                            )}
                          </p>
                        </div>
                      </div>

                  {/* Chat Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowFamilyInvite(true)}
                      className="p-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title={t('messages.familyInvolvement.title')}
                    >
                      <Users className="w-5 h-5" />
                    </button>
                    <div className="relative more-menu-container">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('More menu clicked, current state:', showMoreMenu);
                          setShowMoreMenu(!showMoreMenu);
                        }}
                        className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                        title={t('messages.moreOptions')}
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {/* More Menu Dropdown */}
                      {showMoreMenu && (
                        <div
                          className={`absolute top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50 ${
                            i18n.language === 'ar' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
                          }`}
                          style={{
                            zIndex: 9999,
                            maxHeight: '300px',
                            overflowY: 'auto'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Report user clicked');
                              setShowReportModal(true);
                              setShowMoreMenu(false);
                            }}
                            className={`w-full px-4 py-2 ${i18n.language === 'ar' ? 'text-right' : 'text-left'} text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-none bg-transparent cursor-pointer`}
                          >
                            {i18n.language === 'ar' ? (
                              <>
                                <Flag className="w-4 h-4 text-amber-500" />
                                {t('messages.reportUser')}
                              </>
                            ) : (
                              <>
                                <Flag className="w-4 h-4 text-amber-500" />
                                {t('messages.reportUser')}
                              </>
                            )}
                          </button>
                          {/* Block/Unblock User Button - Dynamic based on conversation status */}
                          {activeConversation?.status === 'blocked' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Unblock user clicked');
                                setShowUnblockModal(true);
                                setShowMoreMenu(false);
                              }}
                              className={`w-full px-4 py-2 ${i18n.language === 'ar' ? 'text-right' : 'text-left'} text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-none bg-transparent cursor-pointer`}
                            >
                              {i18n.language === 'ar' ? (
                                <>
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  {t('messages.unblockUser')}
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  {t('messages.unblockUser')}
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Block user clicked');
                                setShowBlockModal(true);
                                setShowMoreMenu(false);
                              }}
                              className={`w-full px-4 py-2 ${i18n.language === 'ar' ? 'text-right' : 'text-left'} text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-none bg-transparent cursor-pointer`}
                            >
                              {i18n.language === 'ar' ? (
                                <>
                                  <UserX className="w-4 h-4 text-red-500" />
                                  {t('messages.blockUser')}
                                </>
                              ) : (
                                <>
                                  <UserX className="w-4 h-4 text-red-500" />
                                  {t('messages.blockUser')}
                                </>
                              )}
                            </button>
                          )}
                          <div className="border-t border-slate-200 my-1"></div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Delete Chat clicked');
                              setShowDeleteModal(true);
                              setShowMoreMenu(false);
                            }}
                            className={`w-full px-4 py-2 ${i18n.language === 'ar' ? 'text-right' : 'text-left'} text-red-600 hover:bg-red-50 flex items-center gap-3 border-none bg-transparent cursor-pointer`}
                          >
                            {i18n.language === 'ar' ? (
                              <>
                                <Trash2 className="w-4 h-4" />
                                {t('messages.deleteConversation')}
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4" />
                                {t('messages.deleteConversation')}
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-[calc(100%-200px)] relative"
                onScroll={handleScroll}
              >
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                      <p className="text-slate-600">{t('messages.loadingMessages')}</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">{t('messages.noMessages')}</h3>
                      <p className="text-slate-600">{t('messages.startConversation')}</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMyMessage = message.sender_id === userProfile?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                            isMyMessage
                              ? 'bg-gradient-to-r from-primary-600 to-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className={`text-xs ${
                              isMyMessage ? 'text-white/80' : 'text-slate-500'
                            }`}>
                              {new Date(message.created_at).toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                                calendar: 'gregory'
                              })}
                            </p>
                            {isMyMessage && (
                              <div className="flex items-center gap-1">
                                {getStatusIcon(message)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}


              </div>

              {/* Scroll to Bottom Button - Above moderation notice, inside chat area */}
              {showScrollToBottom && (
                <button
                  onClick={() => scrollToBottom(true, 1000)} // Enhanced smooth scroll with 1 second duration
                  className="absolute bottom-36 left-1/2 transform -translate-x-1/2 z-20 bg-primary-600 hover:bg-primary-700 text-white shadow-lg rounded-full p-3 transition-all duration-200 hover:scale-110"
                  title="الانتقال لآخر رسالة"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              )}

              {/* Message Input */}
              <div className="flex-shrink-0 p-4 border-t border-slate-200 bg-white/50">
                {/* Content Monitoring Notice */}
                {/* Content Moderation Notice */}
                <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800">
                    <Shield className="w-4 h-4" />
                    <p className="text-xs">
                      {t('messages.contentModeration')}
                    </p>
                  </div>
                </div>

                {/* Message Input Area */}
                <div className="relative">
                  {/* Block Warning Overlay */}
                  {isUserBlocked(activeConversation) && (
                    <div className="absolute inset-0 bg-red-50/90 backdrop-blur-sm border-2 border-red-200 rounded-xl z-10 flex items-center justify-center">
                      <div className="text-center p-4">
                        <UserX className="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <p className="text-red-700 font-medium text-sm mb-1">
                          {t('messages.blocked.cannotSend')}
                        </p>
                        <p className="text-red-600 text-xs">
                          {t('messages.blocked.unblockToSend')}
                        </p>
                        <button
                          onClick={() => setShowUnblockModal(true)}
                          className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded-lg transition-colors"
                        >
                          {t('messages.blocked.unblockUser')}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <textarea
                        value={newMessage}
                        onChange={handleMessageChange}
                        onKeyPress={handleKeyPress}
                        placeholder={t('messages.typeMessage')}
                        disabled={isUserBlocked(activeConversation)}
                        className={`w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none max-h-32 ${
                          isUserBlocked(activeConversation) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        rows={2}
                        style={{ minHeight: '60px' }}
                      />
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isUserBlocked(activeConversation)}
                      className="flex-shrink-0 p-3 bg-gradient-to-r from-primary-600 to-emerald-600 text-white rounded-xl hover:from-primary-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Family Invite Modal */}
        {showFamilyInvite && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                  {t('messages.familyInvolvement.title')}
                </h3>
                <p className="text-slate-600">
                  {t('messages.familyInvolvement.description')}
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-slate-700 font-medium mb-2">
                    {t('messages.familyInvolvement.emailLabel')}
                  </label>
                  <input
                    type="email"
                    value={familyEmail}
                    onChange={(e) => setFamilyEmail(e.target.value)}
                    placeholder={t('messages.familyInvolvement.emailPlaceholder')}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800 mb-1">{t('messages.familyInvolvement.guidelines')}</h4>
                      <p className="text-sm text-blue-700">
                        {t('messages.familyInvolvement.guidelinesDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowFamilyInvite(false);
                    setFamilyEmail('');
                  }}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  {t('messages.familyInvolvement.cancel')}
                </button>
                <button
                  onClick={handleFamilyInvite}
                  disabled={!familyEmail.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-emerald-600 text-white rounded-xl hover:from-primary-700 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('messages.familyInvolvement.sendInvitation')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Block User Modal */}
        <ConfirmModal
          isOpen={showBlockModal}
          onClose={() => setShowBlockModal(false)}
          onConfirm={handleBlockUser}
          title={t('messages.blockModal.title')}
          message={t('messages.blockModal.message').replace('{name}', getOtherUserName(activeConversation))}
          type="warning"
          confirmText={t('messages.blockModal.confirmButton')}
          cancelText={t('messages.blockModal.cancelButton')}
        />

        {/* Unblock User Modal */}
        <ConfirmModal
          isOpen={showUnblockModal}
          onClose={() => setShowUnblockModal(false)}
          onConfirm={handleUnblockUser}
          title={t('messages.unblockModal.title')}
          message={t('messages.unblockModal.message').replace('{name}', getOtherUserName(activeConversation))}
          type="info"
          confirmText={t('messages.unblockModal.confirmButton')}
          cancelText={t('messages.unblockModal.cancelButton')}
        />

        {/* Report User Modal */}
        <ConfirmModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          onConfirm={(reason) => handleReportUser(reason || '')}
          title={t('messages.reportModal.title')}
          message={t('messages.reportModal.message').replace('{name}', getOtherUserName(activeConversation))}
          type="warning"
          confirmText={t('messages.reportModal.confirmButton')}
          cancelText={t('messages.reportModal.cancelButton')}
          inputType="textarea"
          inputPlaceholder={t('messages.reportModal.placeholder')}
          inputRequired={true}
          inputMaxLength={500}
        />

        {/* Delete Chat Modal */}
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConversation}
          title={t('messages.deleteModal.title')}
          message={t('messages.deleteModal.message')}
          type="error"
          confirmText={t('messages.deleteModal.confirmButton')}
          cancelText={t('messages.deleteModal.cancelButton')}
        />
      </div>
    </div>
  );
};

export default MessagesPage;
