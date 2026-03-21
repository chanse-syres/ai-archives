import { ArrowLeft, Eye, Calendar, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ConversationRecord } from '@/lib/db/types';

/**
 * Interface for the conversation detail data
 */
interface ConversationDetailData {
  conversation: ConversationRecord;
  content: string;
}

/**
 * Fetches conversation detail from the API
 *
 * @param id - The conversation ID
 * @returns Promise<ConversationDetailData> - The conversation data and content
 * @throws Error if the API request fails
 */
async function fetchConversationDetail(id: string): Promise<ConversationDetailData> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/conversation/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Disable caching to get fresh data
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Conversation not found');
      }
      throw new Error(`Failed to fetch conversation: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      conversation: data.conversation,
      content: data.content,
    };
  } catch (error) {
    console.error('Error fetching conversation detail:', error);
    throw error;
  }
}

/**
 * Formats the conversation content for display
 *
 * @param content - Raw conversation content
 * @returns string - Formatted content for display
 */
function formatConversationContent(content: string): string {
  // For now, return the content as-is // COMMENTED OUT ON 03/21 for better formatting - we can implement proper formatting based on the content structure in the future
  // TODO: Implement proper formatting based on the content structure
  // return content; // COMMENTED OUT ON 03/21 for better formatting - we can implement proper formatting based on the content structure in the future END
  const escaped = content // Added on 03/21 to fix the encoding errors - we can implement proper formatting based on the content structure in the future
    .replace(/&/g, '&amp;') //
    .replace(/</g, '&lt;') //
    .replace(/>/g, '&gt;'); // Added on 03/21 to fix the encoding errors - we can implement proper formatting based on the content structure in the future END

  return escaped.replace(/\n/g, '<br />');
}

/**
 * Conversation detail page component
 */
const ConversationDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  try {
    const { conversation, content } = await fetchConversationDetail(id);
    const formattedContent = formatConversationContent(content);

    // Calculate days since creation
    const createdAt = new Date(conversation.createdAt);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    return (
      <div className='flex flex-col min-h-screen bg-gray-100'>
        <header className='bg-gray-200 p-4 flex justify-between items-center'>
          <div className='flex items-center'>
            <Link href='/'>
              <Button variant='ghost' size='sm' className='flex items-center space-x-2'>
                <ArrowLeft className='w-4 h-4' />
                <span>Back to Conversations</span>
              </Button>
            </Link>
          </div>
          <div className='flex items-center'>
            <div className='text-red-800 font-bold flex items-center'>
              <svg className='w-6 h-6 mr-2' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <path d='M12 5L5 19H19L12 5Z' fill='currentColor' />
              </svg>
              <span>AI Archives</span>
            </div>
          </div>
        </header>

        <main className='flex-1 container mx-auto px-4 py-8 max-w-4xl'>
          {/* Conversation Header */}
          <Card className='mb-6 shadow-sm border border-gray-200'>
            <CardHeader className='pb-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-3'>
                  <Badge
                    className={
                      conversation.model === 'ChatGPT'
                        ? 'bg-blue-800 hover:bg-blue-700'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }
                  >
                    {conversation.model}
                  </Badge>
                  <span className='text-sm text-gray-500'>ID: {conversation.id}</span>
                </div>
                <div className='flex items-center space-x-4 text-sm text-gray-500'>
                  <div className='flex items-center space-x-1'>
                    <Eye className='w-4 h-4' />
                    <span>{conversation.views} views</span>
                  </div>
                  <div className='flex items-center space-x-1'>
                    <Calendar className='w-4 h-4' />
                    <span>{daysDiff} days ago</span>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Conversation Content */}
          <Card className='shadow-sm border border-gray-200'>
            <CardContent className='p-6'>
              <div className='flex items-center space-x-2 mb-4'>
                <MessageSquare className='w-5 h-5 text-gray-500' />
                <h2 className='text-xl font-semibold'>Conversation</h2>
              </div>

              <div className='prose max-w-none'>
                <div
                  className='bg-gray-50 p-4 rounded-lg border border-gray-200'
                  dangerouslySetInnerHTML={{ __html: formattedContent }}
                />
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  } catch {
    return (
      <div className='flex flex-col min-h-screen bg-gray-100'>
        <header className='bg-gray-200 p-4 flex justify-between items-center'>
          <div className='flex items-center'>
            <Link href='/'>
              <Button variant='ghost' size='sm' className='flex items-center space-x-2'>
                <ArrowLeft className='w-4 h-4' />
                <span>Back to Conversations</span>
              </Button>
            </Link>
          </div>
          <div className='flex items-center'>
            <div className='text-red-800 font-bold flex items-center'>
              <svg className='w-6 h-6 mr-2' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                <path d='M12 5L5 19H19L12 5Z' fill='currentColor' />
              </svg>
              <span>AI Archives</span>
            </div>
          </div>
        </header>

        <main className='flex-1 container mx-auto px-4 py-8 max-w-4xl'>
          <Card className='shadow-sm border border-gray-200'>
            <CardContent className='p-8 text-center'>
              <h1 className='text-2xl font-semibold text-gray-800 mb-4'>Conversation Not Found</h1>
              <p className='text-gray-500 mb-6'>
                The conversation you&apos;re looking for doesn&apos;t exist or has been removed.
              </p>
              <Link href='/'>
                <Button>Back to Conversations</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }
};

export default ConversationDetailPage;
