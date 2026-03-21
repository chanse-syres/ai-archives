import { HelpCircle } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConversationRecord } from '@/lib/db/types';
import Link from 'next/link';

/**
 * Interface for the conversation data displayed in cards
 */
interface ConversationCardData {
  id: string;
  avatar: string;
  username: string;
  platform: string;
  views: number;
  days: number;
  related: number;
}

/**
 * Fetches conversations from the API
 *
 * @returns Promise<ConversationRecord[]> - Array of conversation records
 * @throws Error if the API request fails
 */
async function fetchConversations(): Promise<ConversationRecord[]> {
  try {
    if (process.env.SKIP_DB_PERSISTENCE === 'true') { // Added on 03/20 for local testing without DB persistence - skip API call and return empty array
      return [];
    } // Added on 03/20 for local testing without DB persistence END
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/conversation?limit=50`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Disable caching to get fresh data
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.conversations || [];
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
}

/**
 * Transforms conversation records into card data format
 *
 * @param conversations - Array of conversation records from the database
 * @returns ConversationCardData[] - Array of formatted card data
 */
function transformConversationsToCardData(conversations: ConversationRecord[]): ConversationCardData[] {
  return conversations.map((conversation) => {
    // Calculate days since creation
    const createdAt = new Date(conversation.createdAt);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    // Generate avatar from model name
    const avatar = conversation.model.charAt(0).toUpperCase();

    return {
      id: conversation.id,
      avatar,
      username: 'Anonymous',
      platform: conversation.model,
      views: conversation.views,
      days: daysDiff,
      related: 0,
    };
  });
}

/**
 * Home page component that displays a list of AI conversations
 */
const Home = async () => {
  // Fetch conversations from the API
  const conversations = await fetchConversations();
  const cardData = transformConversationsToCardData(conversations);

  return (
    <div className='flex flex-col min-h-screen bg-gray-100'>
      <header className='bg-gray-200 p-4 flex justify-between items-center'>
        <div className='flex items-center'>
          <div className='text-red-800 font-bold flex items-center'>
            <svg className='w-6 h-6 mr-2' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <path d='M12 5L5 19H19L12 5Z' fill='currentColor' />
            </svg>
            <span>AI Archives</span>
          </div>
        </div>
        <div className='flex items-center space-x-4'>
          <Button variant='ghost' size='sm' className='flex items-center space-x-2'>
            <HelpCircle className='w-5 h-5' />
            <span className='text-sm'>How to Use</span>
          </Button>
        </div>
      </header>

      <main className='flex-1 container mx-auto px-4 py-8 max-w-6xl'>
        <Card className='p-6 mb-8 shadow-sm border border-gray-200'>
          <CardContent className='pt-6'>
            <h1 className='text-3xl font-semibold mb-6 text-center'>
              Share, Discuss, Cite <span className='text-pink-500'>ChatGPT</span> Conversations
            </h1>
            <p className='text-center mb-8'>
              Your reliable tool for citing Generative A.I. conversations. Easily save discussions with Gemini, ChatGPT,
              Meta and Claude into a URL.
            </p>
          </CardContent>
        </Card>

        {cardData.length === 0 ? (
          <Card className='p-8 text-center'>
            <CardContent>
              <p className='text-gray-500 text-lg'>No conversations found. Be the first to share a conversation!</p>
            </CardContent>
          </Card>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {cardData.map((card) => (
              <Link key={card.id} href={`/conversation/${card.id}`}>
                <Card className='overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 cursor-pointer hover:border-gray-300'>
                  <CardContent className='pt-6 px-6'>
                    <div className='flex items-start space-x-4'>
                      <Avatar
                        className={`h-10 w-10 ${
                          card.avatar === 'S' || card.avatar === 'L'
                            ? 'bg-blue-600'
                            : card.avatar === 'P' || card.avatar === 'U'
                            ? 'bg-orange-600'
                            : card.avatar === 'C' || card.avatar === 'J'
                            ? 'bg-purple-600'
                            : 'bg-gray-600'
                        }`}
                      >
                        <AvatarFallback className='text-white text-sm'>{card.avatar}</AvatarFallback>
                      </Avatar>
                      <div className='flex-1 pt-1'>
                        <p className='text-sm font-medium text-gray-800 leading-relaxed'>{card.username}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className='px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500'>
                    <div>
                      <Badge
                        className={
                          card.platform === 'ChatGPT'
                            ? 'bg-blue-800 hover:bg-blue-700'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }
                      >
                        {card.platform}
                      </Badge>
                    </div>
                    <div className='flex space-x-2'>
                      <span>{card.views} Views</span>
                      <span>|</span>
                      <span>{card.days} Days ago</span>
                      <span>|</span>
                      <span>{card.related} Related</span>
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
