import React from 'react';

interface TableColumn {
  header: string;
  accessor: string; // Key in the data objects
  render?: (data: any) => React.ReactNode; // Optional custom renderer
}

interface TableProps<T extends object> {
  columns: TableColumn[];
  data: T[];
  className?: string;
}

const Table = <T extends object>({
  columns,
  data,
  className = '',
}: TableProps<T>): React.ReactElement => {
  return (
    <div className={`overflow-x-auto shadow-md rounded-lg ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.accessor}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td
                    key={col.accessor}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                  >
                    {col.render ? col.render(row) : (row as any)[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-4 text-center text-sm text-gray-500"
              >
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
