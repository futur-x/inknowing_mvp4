'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { BookOpen, User, Calendar, Globe, Tag, FileImage, Users } from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookMetadata, BookCharacter, LanguageOptions, CategoryOptions } from '@/types/upload';
import { validateISBN, formatISBN } from '@/lib/upload-utils';

const bookFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  author: z.string().min(1, 'Author is required').max(100),
  isbn: z
    .string()
    .optional()
    .refine((val) => !val || validateISBN(val), 'Invalid ISBN format'),
  publicationYear: z
    .number()
    .min(1000)
    .max(new Date().getFullYear() + 1)
    .optional(),
  description: z.string().max(2000).optional(),
  categories: z.array(z.string()).min(1, 'At least one category is required'),
  language: z.string().min(1, 'Language is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});

interface BookFormProps {
  initialData?: Partial<BookMetadata>;
  onSubmit: (data: BookMetadata) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function BookForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: BookFormProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialData?.categories || []
  );
  const [characters, setCharacters] = useState<BookCharacter[]>(
    initialData?.characters || []
  );
  const [newCharacter, setNewCharacter] = useState<Partial<BookCharacter>>({});
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const form = useForm<z.infer<typeof bookFormSchema>>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      author: initialData?.author || '',
      isbn: initialData?.isbn || '',
      publicationYear: initialData?.publicationYear || new Date().getFullYear(),
      description: initialData?.description || '',
      categories: initialData?.categories || [],
      language: initialData?.language || 'en',
      difficulty: initialData?.difficulty || 'intermediate',
    },
  });

  useEffect(() => {
    if (initialData) {
      Object.keys(initialData).forEach((key) => {
        if (key in form.getValues()) {
          form.setValue(key as any, initialData[key as keyof BookMetadata]);
        }
      });

      if (initialData.categories) {
        setSelectedCategories(initialData.categories);
      }

      if (initialData.characters) {
        setCharacters(initialData.characters);
      }
    }
  }, [initialData, form]);

  const handleSubmit = (values: z.infer<typeof bookFormSchema>) => {
    const metadata: BookMetadata = {
      ...values,
      categories: selectedCategories,
      characters: characters.length > 0 ? characters : undefined,
      coverImage: coverPreview || undefined,
    };

    onSubmit(metadata);
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) => {
      const updated = prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category];

      form.setValue('categories', updated);
      return updated;
    });
  };

  const handleAddCharacter = () => {
    if (newCharacter.name && newCharacter.description) {
      setCharacters((prev) => [
        ...prev,
        {
          ...newCharacter,
          role: newCharacter.role || 'Supporting',
          traits: newCharacter.traits || [],
        } as BookCharacter,
      ]);
      setNewCharacter({});
    }
  };

  const handleRemoveCharacter = (index: number) => {
    setCharacters((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="characters">Characters</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Book Information</CardTitle>
                <CardDescription>Essential details about the book</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <BookOpen className="inline h-4 w-4 mr-2" />
                        Book Title
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter book title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <User className="inline h-4 w-4 mr-2" />
                        Author
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter author name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="isbn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ISBN (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="978-0-123456-78-9"
                            {...field}
                            onChange={(e) => {
                              const formatted = formatISBN(e.target.value);
                              field.onChange(formatted);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="publicationYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Calendar className="inline h-4 w-4 mr-2" />
                          Publication Year
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={String(new Date().getFullYear())}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Globe className="inline h-4 w-4 mr-2" />
                        Language
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LanguageOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Details</CardTitle>
                <CardDescription>Enhance discoverability and context</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter a brief description of the book..."
                          className="min-h-[120px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum 2000 characters ({field.value?.length || 0}/2000)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categories"
                  render={() => (
                    <FormItem>
                      <FormLabel>
                        <Tag className="inline h-4 w-4 mr-2" />
                        Categories
                      </FormLabel>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {CategoryOptions.map((category) => (
                          <Badge
                            key={category.value}
                            variant={
                              selectedCategories.includes(category.value)
                                ? 'default'
                                : 'outline'
                            }
                            className="cursor-pointer"
                            onClick={() => handleCategoryToggle(category.value)}
                          >
                            {category.label}
                          </Badge>
                        ))}
                      </div>
                      <FormDescription>Select at least one category</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reading Difficulty</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select difficulty level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>
                    <FileImage className="inline h-4 w-4 mr-2" />
                    Cover Image
                  </FormLabel>
                  <div className="mt-2 space-y-2">
                    {coverPreview && (
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        className="h-32 w-24 object-cover rounded"
                      />
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="characters" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  <Users className="inline h-4 w-4 mr-2" />
                  Book Characters
                </CardTitle>
                <CardDescription>
                  Define characters for dialogue interactions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {characters.map((character, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{character.name}</p>
                      <p className="text-sm text-gray-600">{character.description}</p>
                      <p className="text-xs text-gray-500">Role: {character.role}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCharacter(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}

                <div className="space-y-2 border-t pt-4">
                  <p className="text-sm font-medium">Add Character</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Character name"
                      value={newCharacter.name || ''}
                      onChange={(e) =>
                        setNewCharacter({ ...newCharacter, name: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Role (e.g., Protagonist)"
                      value={newCharacter.role || ''}
                      onChange={(e) =>
                        setNewCharacter({ ...newCharacter, role: e.target.value })
                      }
                    />
                  </div>
                  <Textarea
                    placeholder="Character description..."
                    value={newCharacter.description || ''}
                    onChange={(e) =>
                      setNewCharacter({ ...newCharacter, description: e.target.value })
                    }
                    className="min-h-[80px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCharacter}
                    disabled={!newCharacter.name || !newCharacter.description}
                  >
                    Add Character
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting} className="ml-auto">
            {isSubmitting ? 'Saving...' : 'Save Metadata'}
          </Button>
        </div>
      </form>
    </Form>
  );
}