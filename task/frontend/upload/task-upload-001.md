# Task-UPLOAD-001: 书籍上传功能开发

## 任务信息
- **Task ID**: UPLOAD-001
- **Title**: 实现书籍文件上传功能
- **Priority**: P1
- **Estimated Hours**: 7-9小时
- **Dependencies**: BASE-001, BASE-002, AUTH-002

## UI/UX需求
### 页面布局（基于devDocument.md第168-228行）
```
上传页面布局：
┌──────────────────────────────────────────────┐
│  Header (上传书籍导航)                        │
│                                              │
│  ┌────────────────────────────────────────────┐│
│  │ 上传书籍，与更多人分享知识                  ││
│  │                                            ││
│  │ 上传须知：                                 ││
│  │ • 支持TXT、PDF格式（限10MB）               ││
│  │ • 请确保您有权分享此内容                   ││
│  │ • 上传后其他用户也可以对话                 ││
│  │ • 您将获得100积分奖励                      ││
│  └────────────────────────────────────────────┘│
│                                              │
│  ┌────────────────────────────────────────────┐│
│  │           拖拽上传区域                      ││
│  │    ┌────────────────────────────────┐     ││
│  │    │         📁                     │     ││
│  │    │   [选择文件] 或拖拽文件到此处    │     ││
│  │    │                                │     ││
│  │    │   支持: .txt, .pdf (最大10MB)   │     ││
│  │    └────────────────────────────────┘     ││
│  └────────────────────────────────────────────┘│
│                                              │
│  文件检测结果（选择文件后显示）:               │
│  ┌────────────────────────────────────────────┐│
│  │ 文件检测中... ✓                           ││
│  │ ✓ 格式正确                                ││
│  │ ✓ 大小：1.8MB                           ││
│  │ ✓ 编码：UTF-8                            ││
│  │                                          ││
│  │ 请完善书籍信息：                          ││
│  │ 书名：[掌控习惯] (自动识别)               ││
│  │ 作者：[James Clear] (需要填写)           ││
│  │ 分类：[下拉选择：自我提升]                ││
│  │ 简介：[选填，最多200字]                   ││
│  │                                          ││
│  │ [开始处理]                               ││
│  └────────────────────────────────────────────┘│
│                                              │
│  处理进度（点击开始处理后）:                   │
│  ┌────────────────────────────────────────────┐│
│  │ 智能处理中（预计需要2-3分钟）              ││
│  │                                          ││
│  │ [✓] 检测AI是否已了解此书... AI未知，需要向量化 ││
│  │ [✓] 文本预处理...                         ││
│  │ [✓] 智能分章节... 检测到12个章节           ││
│  │ [✓] 提取关键角色... 发现2个可对话角色      ││
│  │ [⚡] 向量化处理... 45%                   ││
│  │ [ ] 创建知识索引...                       ││
│  │ [ ] 生成对话模型...                       ││
│  │                                          ││
│  │ 提取到的角色：                            ││
│  │ • 詹姆斯·克利尔（作者视角）               ││
│  │ • 习惯教练（虚拟助手）                    ││
│  └────────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

### 视觉设计要求
- **拖拽区域**: 虚线边框，hover时高亮amber色
- **进度指示**: 分步骤展示，已完成步骤显示绿色勾号
- **错误状态**: 红色提示，提供重试选项
- **成功状态**: 庆祝动效，积分奖励提示

## 技术需求
### 页面路由和权限
```typescript
// app/upload/page.tsx
interface UploadPageProps {
  searchParams: { type?: 'book' | 'document' };
}

// 权限检查
const UploadPage = async ({ searchParams }: UploadPageProps) => {
  const user = await getUserProfile();

  // 检查上传权限（可能需要会员等级）
  if (!canUpload(user)) {
    redirect('/membership?reason=upload');
  }

  return <UploadPageContent type={searchParams.type} />;
};
```

### 文件上传组件
```typescript
interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileValidation: (result: ValidationResult) => void;
  acceptedTypes: string[];
  maxSize: number; // 字节
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fileInfo: {
    name: string;
    size: number;
    type: string;
    encoding?: string;
  };
}

const FileUploadZone: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileValidation,
  acceptedTypes = ['.txt', '.pdf'],
  maxSize = 10 * 1024 * 1024 // 10MB
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateFile = (file: File): ValidationResult => {
    const errors: string[] = [];

    // 文件大小检查
    if (file.size > maxSize) {
      errors.push(`文件大小超限，最大支持${maxSize / 1024 / 1024}MB`);
    }

    // 文件类型检查
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(extension)) {
      errors.push(`不支持的文件格式，仅支持：${acceptedTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    };
  };

  // 拖拽处理
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      const validation = validateFile(file);
      onFileValidation(validation);

      if (validation.isValid) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    }
  };

  return (
    <div
      className={`
        border-2 border-dashed rounded-lg p-8 text-center
        transition-colors duration-200
        ${isDragging
          ? 'border-amber-400 bg-amber-50'
          : 'border-slate-300 hover:border-amber-300'
        }
      `}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
    >
      <FileIcon className="w-16 h-16 mx-auto mb-4 text-slate-400" />

      {selectedFile ? (
        <FilePreview file={selectedFile} />
      ) : (
        <>
          <p className="text-lg mb-2">选择文件或拖拽文件到此处</p>
          <p className="text-sm text-slate-500">
            支持: {acceptedTypes.join(', ')} (最大{maxSize / 1024 / 1024}MB)
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            选择文件
          </Button>
          <input
            id="file-input"
            type="file"
            accept={acceptedTypes.join(',')}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const validation = validateFile(file);
                onFileValidation(validation);
                if (validation.isValid) {
                  setSelectedFile(file);
                  onFileSelect(file);
                }
              }
            }}
          />
        </>
      )}
    </div>
  );
};
```

### 书籍信息表单
```typescript
interface BookInfoFormProps {
  initialData?: Partial<BookMetadata>;
  onSubmit: (data: BookMetadata) => void;
  loading?: boolean;
}

interface BookMetadata {
  title: string;
  author: string;
  category: string;
  description?: string;
  isbn?: string;
  publishYear?: number;
}

const BookInfoForm: React.FC<BookInfoFormProps> = ({
  initialData = {},
  onSubmit,
  loading = false
}) => {
  const form = useForm<BookMetadata>({
    resolver: zodResolver(bookMetadataSchema),
    defaultValues: {
      title: initialData.title || '',
      author: initialData.author || '',
      category: initialData.category || '',
      description: initialData.description || ''
    }
  });

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">完善书籍信息</h3>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>书名 *</FormLabel>
                <FormControl>
                  <Input placeholder="请输入书名" {...field} />
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
                <FormLabel>作者 *</FormLabel>
                <FormControl>
                  <Input placeholder="请输入作者姓名" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>分类 *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择书籍分类" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {bookCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>简介 (选填)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="简单介绍这本书的内容..."
                    maxLength={200}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {field.value?.length || 0}/200
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            开始处理
          </Button>
        </form>
      </Form>
    </Card>
  );
};
```

### 处理进度组件
```typescript
interface ProcessingProgressProps {
  uploadId: string;
  onComplete: (result: ProcessingResult) => void;
  onError: (error: Error) => void;
}

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  details?: string;
}

interface ProcessingResult {
  bookId: string;
  chapters: number;
  characters: Character[];
  pointsEarned: number;
}

const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  uploadId,
  onComplete,
  onError
}) => {
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: 'ai-check', label: '检测AI是否已了解此书', status: 'pending' },
    { id: 'preprocess', label: '文本预处理', status: 'pending' },
    { id: 'chapters', label: '智能分章节', status: 'pending' },
    { id: 'characters', label: '提取关键角色', status: 'pending' },
    { id: 'vectorize', label: '向量化处理', status: 'pending' },
    { id: 'index', label: '创建知识索引', status: 'pending' },
    { id: 'model', label: '生成对话模型', status: 'pending' }
  ]);

  const [extractedCharacters, setExtractedCharacters] = useState<Character[]>([]);

  // 轮询处理状态
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const status = await uploadAPI.getUploadStatus(uploadId);

        setSteps(status.steps);
        setExtractedCharacters(status.characters || []);

        if (status.status === 'completed') {
          onComplete(status.result);
        } else if (status.status === 'error') {
          onError(new Error(status.error));
        }
      } catch (error) {
        onError(error as Error);
      }
    };

    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [uploadId, onComplete, onError]);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">
        智能处理中（预计需要2-3分钟）
      </h3>

      <div className="space-y-4">
        {steps.map((step) => (
          <ProcessingStepItem key={step.id} step={step} />
        ))}
      </div>

      {extractedCharacters.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium mb-2">提取到的角色：</h4>
          <div className="space-y-2">
            {extractedCharacters.map((character, index) => (
              <div key={index} className="flex items-center text-sm">
                <User className="w-4 h-4 mr-2 text-amber-500" />
                <span className="font-medium">{character.name}</span>
                <span className="text-slate-500 ml-2">- {character.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

const ProcessingStepItem: React.FC<{ step: ProcessingStep }> = ({ step }) => {
  const getIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Circle className="w-5 h-5 text-slate-300" />;
    }
  };

  return (
    <div className="flex items-center space-x-3">
      {getIcon()}
      <div className="flex-1">
        <div className="text-sm font-medium">{step.label}</div>
        {step.details && (
          <div className="text-xs text-slate-500">{step.details}</div>
        )}
        {step.progress !== undefined && (
          <Progress value={step.progress} className="mt-1 h-2" />
        )}
      </div>
    </div>
  );
};
```

### API集成
```typescript
// 基于api-specification.yaml
const uploadAPI = {
  // POST /uploads/check
  checkBookExists: async (title: string, author: string) => {
    return api.post('/uploads/check', { title, author });
  },

  // POST /uploads
  uploadBook: async (file: File, metadata: BookMetadata) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    return api.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        // 更新上传进度
      }
    });
  },

  // GET /uploads/{uploadId}
  getUploadStatus: async (uploadId: string) => {
    return api.get(`/uploads/${uploadId}`);
  },

  // GET /uploads/my
  getMyUploads: async () => {
    return api.get('/uploads/my');
  }
};
```

## 验收标准
### 功能要求
- [ ] 文件拖拽上传正常
- [ ] 文件格式和大小验证
- [ ] 书籍信息表单验证
- [ ] 重复书籍检查
- [ ] 处理进度实时显示
- [ ] 错误处理和重试

### 性能要求
- [ ] 大文件上传优化
- [ ] 断点续传支持
- [ ] 处理状态轮询优化
- [ ] 内存使用控制

### 用户体验
- [ ] 上传状态清晰
- [ ] 错误提示友好
- [ ] 成功反馈明确
- [ ] 进度展示详细

## 相关文档引用
- devDocument.md: 第168-228行（上传流程）
- api-specification.yaml: 上传相关API
- user-journey-diagram.md: 第101-118行（上传流程）