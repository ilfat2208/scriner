'use client';

import { useState, useMemo } from 'react';
import { Combobox, useCombobox, Input, Pill, Group, ActionIcon } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';

interface SymbolSearchProps {
  availableSymbols: string[];
  selectedSymbols: string[];
  onAddSymbol: (symbol: string) => void;
  onRemoveSymbol: (symbol: string) => void;
}

export function SymbolSearch({
  availableSymbols,
  selectedSymbols,
  onAddSymbol,
  onRemoveSymbol,
}: SymbolSearchProps) {
  const [search, setSearch] = useState('');
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      combobox.updateSelectedOptionIndex('active');
    },
  });

  const filteredSymbols = useMemo(() => {
    if (!search) return [];
    return availableSymbols
      .filter(
        (symbol) =>
          symbol.includes(search.toUpperCase()) &&
          !selectedSymbols.includes(symbol)
      )
      .slice(0, 10);
  }, [search, availableSymbols, selectedSymbols]);

  const handleSelect = (value: string) => {
    if (value && !selectedSymbols.includes(value)) {
      onAddSymbol(value);
      setSearch('');
    }
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <Group gap="xs" mb="xs" style={{ flexWrap: 'wrap' }}>
        {selectedSymbols.map((symbol) => (
          <Pill
            key={symbol}
            withRemoveButton
            onRemove={() => onRemoveSymbol(symbol)}
            style={{
              backgroundColor: '#2d2d2d',
              color: 'white',
              border: '1px solid #3d3d3d',
            }}
          >
            {symbol.replace('USDT', '')}
          </Pill>
        ))}
      </Group>

      <Combobox
        store={combobox}
        onOptionSubmit={handleSelect}
        withinPortal={false}
      >
        <Combobox.Target>
          <Input
            leftSection={<IconSearch size={16} />}
            placeholder="Поиск пары (например, BTCUSDT)..."
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              combobox.openDropdown();
            }}
            onFocus={() => combobox.openDropdown()}
            onClick={() => combobox.openDropdown()}
            onBlur={() => combobox.closeDropdown()}
            style={{ backgroundColor: '#2d2d2d', border: '1px solid #3d3d3d' }}
          />
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Options>
            {filteredSymbols.length === 0 && search && (
              <Combobox.Empty>Ничего не найдено</Combobox.Empty>
            )}
            {filteredSymbols.map((symbol) => (
              <Combobox.Option value={symbol} key={symbol}>
                {symbol}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </div>
  );
}
