
// src/app/teacher/content/books/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, PlusCircle, UploadCloud, Search, Edit2, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { api } from '@/lib/api';
import type { Book } from '@/interfaces'; // Assuming your Book interface is correct
import { Skeleton } from '@/components/ui/skeleton';

export default function ManageBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchBooks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<Book[] | { results: Book[] }>('/books/');
        const fetchedBooks = Array.isArray(response) ? response : response.results || [];
        setBooks(fetchedBooks);
      } catch (err) {
        console.error("Failed to fetch books:", err);
        setError(err instanceof Error ? err.message : "Could not load books data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchBooks();
  }, []);

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (book.subject_name && book.subject_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center"><FileText className="mr-3 text-primary" /> Manage Books & Resources</h1>
          <p className="text-muted-foreground">Upload, organize, and share supplementary materials with your students.</p>
        </div>
        <Button size="lg" onClick={() => alert("Open 'Upload Book' dialog - TBI")}>
          <UploadCloud className="mr-2 h-5 w-5" /> Upload New Resource
        </Button>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <CardTitle>Uploaded Resources</CardTitle>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by title, subject, author..." 
                className="pl-9" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
            </div>
          ) : error ? (
             <Card className="text-center py-6 bg-destructive/10 border-destructive rounded-md">
                <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" />
                <CardTitle className="text-lg">Error Loading Books</CardTitle>
                <CardDescription className="text-destructive-foreground">{error}</CardDescription>
            </Card>
          ) : filteredBooks.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {books.length === 0 ? "No books or resources uploaded yet." : "No resources found matching your search."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Author</TableHead>
                    <TableHead className="hidden sm:table-cell">Subject</TableHead>
                    <TableHead className="hidden md:table-cell text-center">Class</TableHead>
                    {/* <TableHead>Date Added</TableHead> */}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks.map((book) => (
                    <TableRow key={book.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {book.file_url ? (
                            <a href={book.file_url} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                                {book.title}
                            </a>
                        ) : book.title}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{book.author || 'N/A'}</TableCell>
                      <TableCell className="hidden sm:table-cell">{book.subject_name || 'N/A'}</TableCell>
                      <TableCell className="hidden md:table-cell text-center">{book.class_name || 'N/A'}</TableCell>
                      {/* <TableCell>{new Date(book.dateAdded).toLocaleDateString()}</TableCell> */}
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" title="Edit" asChild>
                          {/* TODO: Link to edit page: `/teacher/content/books/${book.id}/edit` */}
                          <a> <Edit2 className="h-4 w-4" /> </a>
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete" className="text-destructive hover:text-destructive" onClick={() => alert(`Delete Book ${book.id} - TBI`)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
