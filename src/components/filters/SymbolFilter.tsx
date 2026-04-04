'use client';

import { useState } from 'react';
import { Combobox, useCombobox, Input, Pill, Group } from '@mantine/core';
import { Search } from 'lucide-react';

interface SymbolFilterProps {
  availableSymbols: string[];
  selectedSymbols: string[];
  onAddSymbol: (symbol: string) => void;
  onRemoveSymbol: (symbol: string) => void;
}

export function SymbolFilter({
  availableSymbols,
  selectedSymbols,
  onAddSymbol,
  onRemoveSymbol,
}: SymbolFilterProps) {
  const [search, setSearch] = useState('');
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      combobox.updateSelectedOptionIndex('active');
    },
  });

  const filteredSymbols = availableSymbols.filter(
    (symbol) =>
      symbol.includes(search.toUpperCase()) &&
      !selectedSymbols.includes(symbol)
  ).slice(0, 10);

  const handleSelect = (value: string) => {
    if (value && !selectedSymbols.includes(value)) {
      onAddSymbol(value);
      setSearch('');
    }
  };

  return (
    <div className="bg-surface border border-gray-800 rounded-xl p-4">
      <div className="mb-3">
        <Group gap="xs" className="flex-wrap">
          {selectedSymbols.map((symbol) => (
            <Pill
              key={symbol}
              withRemoveButton
              onRemove={() => onRemoveSymbol(symbol)}
              className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors"
            >
              {symbol.replace('USDT', '')}
            </Pill>
          ))}
        </Group>
      </div>

      <Combobox
        store={combobox}
        onOptionSubmit={handleSelect}
        withinPortal={false}
      >
        <Combobox.Target>
          <Input
            leftSection={<Search size={16} className="text-gray-400" />}
            placeholder="Поиск пары (например, BTCUSDT)..."
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              combobox.openDropdown();
            }}
            onFocus={() => combobox.openDropdown()}
            className="bg-surface2 border-gray-700 focus:border-primary transition-colors"
          />
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Options className="bg-surface border border-gray-700 rounded-lg">
            {filteredSymbols.length === 0 && search && (
              <Combobox.Empty className="p-3 text-gray-400 text-sm">
                Ничего не найдено
              </Combobox.Empty>
            )}
            {filteredSymbols.map((symbol) => (
              <Combobox.Option 
                value={symbol} 
                key={symbol}
                className="px-3 py-2 hover:bg-primary/10 cursor-pointer transition-colors"
              >
                {symbol}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </div>
  );
}
