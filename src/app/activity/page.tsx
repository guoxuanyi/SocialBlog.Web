import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

export default function ActivityPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans page-in">
      <Header title="Inbox" mode="detail" showBack={true} showSearch={false} />
      <main className="flex-1 max-w-5xl xl:max-w-6xl w-full mx-auto p-4 pb-20 md:pb-4">
        <div className="space-y-3">
          {[
            { title: '有人点赞了你的文章', desc: '刚刚' },
            { title: '有人评论了你的文章', desc: '10 分钟前' },
            { title: '新关注：Alex Rivera', desc: '昨天' },
          ].map((n, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-semibold">
                N
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">{n.title}</div>
                <div className="mt-1 text-xs text-gray-500">{n.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
