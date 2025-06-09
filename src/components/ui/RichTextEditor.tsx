import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill Snow theme CSS

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  readOnly = false,
}) => {
  const modules = {
    toolbar: [
      [{ header: '1' }, { header: '2' }], // "Large" and "Normal" headings
      // [{ size: ['small', false, 'large', 'huge'] }], // Custom font sizes - can be added if needed
      ['bold', 'italic', 'underline', 'strike'], // Toggled buttons
      [{ list: 'ordered' }, { list: 'bullet' }],
      // [{ script: 'sub' }, { script: 'super' }], // Subscript/superscript - can be added if needed
      // [{ indent: '-1' }, { indent: '+1' }], // Outdent/indent - can be added if needed
      // [{ direction: 'rtl' }], // Text direction - can be added if needed
      // [{ color: [] }, { background: [] }], // Font color and background color - can be added if needed
      // [{ font: [] }], // Font family - can be added if needed
      // [{ align: [] }], // Text alignment - can be added if needed
      ['link', 'image'], // Link and image - image might be complex to handle (uploading, etc.)
      ['clean'], // Remove formatting button
    ],
    clipboard: {
      // Match visual representation for pasted content
      matchVisual: false,
    },
  };

  const formats = [
    'header',
    // 'font', 'size', // Uncomment if added to modules
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    // 'indent', // Uncomment if added to modules
    'link', 'image',
    // 'color', 'background', // Uncomment if added to modules
    // 'script', // Uncomment if added to modules
    // 'align', // Uncomment if added to modules
    // 'direction', // Uncomment if added to modules
  ];

  return (
    <ReactQuill
      theme="snow"
      value={value}
      onChange={onChange}
      modules={modules}
      formats={formats}
      placeholder={placeholder}
      readOnly={readOnly}
      className={readOnly ? 'ql-read-only' : ''}
      style={readOnly ? { border: 'none' } : {}}
    />
  );
};

export default RichTextEditor;
