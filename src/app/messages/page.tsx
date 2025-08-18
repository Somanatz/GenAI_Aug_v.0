// src/app/messages/page.tsx
'use client';

import { Suspense } from 'react';
import MessageClientPage from './MessageClientPage';
import { Loader2 } from 'lucide-react';

export default function MessagesPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <MessageClientPage />
        </Suspense>
    );
}
