import React from 'react';
import { Box, Text } from 'ink';

export interface Column<T> {
  key: keyof T;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  color?: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  selectedIndex?: number;
  onSelect?: (item: T, index: number) => void;
  showHeader?: boolean;
  striped?: boolean;
}

export function Table<T extends Record<string, unknown>>({
  data,
  columns,
  selectedIndex,
  showHeader = true,
  striped = false,
}: TableProps<T>) {
  const getCellValue = (row: T, col: Column<T>): React.ReactNode => {
    const value = row[col.key];
    if (col.render) {
      return col.render(value, row);
    }
    return String(value ?? '');
  };

  const truncate = (str: string, width: number): string => {
    if (str.length <= width) return str.padEnd(width);
    return str.slice(0, width - 1) + '…';
  };

  return (
    <Box flexDirection="column">
      {showHeader && (
        <Box
          flexDirection="row"
          borderStyle="single"
          borderBottom
          borderLeft={false}
          borderRight={false}
          borderTop={false}
          borderColor="gray"
        >
          {columns.map((col, i) => (
            <Box key={i} width={col.width || 15}>
              <Text bold color="cyan">
                {truncate(col.header, col.width || 15)}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {data.map((row, rowIndex) => {
        const isSelected = rowIndex === selectedIndex;
        const isStriped = striped && rowIndex % 2 === 1;

        return (
          <Box key={rowIndex} flexDirection="row">
            {columns.map((col, colIndex) => (
              <Box key={colIndex} width={col.width || 15}>
                <Text
                  color={isSelected ? 'cyan' : isStriped ? 'gray' : col.color}
                  bold={isSelected}
                  inverse={isSelected}
                >
                  {typeof getCellValue(row, col) === 'string'
                    ? truncate(
                        getCellValue(row, col) as string,
                        col.width || 15
                      )
                    : getCellValue(row, col)}
                </Text>
              </Box>
            ))}
          </Box>
        );
      })}
    </Box>
  );
}
