'use client';

import { api } from '@workspace/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { FileText, Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { DocumentCard } from '@/components/molecules/documents/DocumentCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSession } from '@/modules/auth/useSession';

/**
 * Documents list page.
 * Displays all user documents with search functionality.
 */
export default function DocumentsPage() {
  const router = useRouter();
  const { sessionId } = useSession();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all documents
  const allDocuments = useQuery(api.documents.getDocuments, { sessionId });

  // Fetch search results (only when searching)
  const searchResults = useQuery(
    api.documents.searchDocuments,
    searchQuery.trim() ? { sessionId, query: searchQuery.trim() } : 'skip'
  );

  // Use search results when searching, otherwise use all documents
  const documents = searchQuery.trim() ? searchResults : allDocuments;

  const handleNewDocument = useCallback(() => {
    router.push('/app/documents/new');
  }, [router]);

  const handleDocumentClick = useCallback(
    (documentId: string) => {
      router.push(`/app/documents/${documentId}`);
    },
    [router]
  );

  return (
    <div className="container mx-auto max-w-4xl py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Documents</h1>
        </div>
        <Button onClick={handleNewDocument}>
          <Plus className="h-4 w-4 mr-2" />
          New Document
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          type="search"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Documents list */}
      {documents === undefined ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">
            {searchQuery.trim() ? 'No documents found' : 'No documents yet'}
          </h2>
          <p className="text-muted-foreground mb-4">
            {searchQuery.trim()
              ? 'Try a different search term.'
              : 'Create your first document to get started.'}
          </p>
          {!searchQuery.trim() && (
            <Button onClick={handleNewDocument}>
              <Plus className="h-4 w-4 mr-2" />
              Create Document
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <DocumentCard
              key={doc._id}
              document={doc}
              onClick={() => handleDocumentClick(doc._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
