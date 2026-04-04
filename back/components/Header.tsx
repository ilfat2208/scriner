'use client';

import { useState } from 'react';
import { Select, SegmentedControl, ActionIcon, Group, Text, Avatar, Badge } from '@mantine/core';
import {
  IconSearch,
  IconBell,
  IconSettings,
  IconChartBar,
  IconLayoutGrid,
  IconMap,
  IconReport,
  IconTrendingUp,
  IconLogout,
  IconSun,
  IconFileExport,
} from '@tabler/icons-react';
import { EXCHANGES, INTERVALS, GRID_SIZES, PRICE_RANGES, Mode, Interval, GridSize, PriceRange, Ticker } from '@/types';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ExportCSV } from '@/components/ExportCSV';

interface HeaderProps {
  exchange: string;
  setExchange: (value: string) => void;
  mode: Mode;
  setMode: (value: Mode) => void;
  interval: Interval;
  setInterval: (value: Interval) => void;
  gridSize: GridSize;
  setGridSize: (value: GridSize) => void;
  priceRange: PriceRange;
  setPriceRange: (value: PriceRange) => void;
  tickers?: Ticker[];
}

export function Header({
  exchange,
  setExchange,
  mode,
  setMode,
  interval,
  setInterval,
  gridSize,
  setGridSize,
  priceRange,
  setPriceRange,
  tickers = [],
}: HeaderProps) {
  return (
    <header
      style={{
        backgroundColor: '#1a1b1e',
        borderBottom: '1px solid #2d2d2d',
        padding: '0 1rem',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', minWidth: '120px' }}>
        <a href="/market-map">
          <svg
            data-height="46"
            viewBox="0 0 219.54 104.23"
            width="120"
            style={{ cursor: 'pointer' }}
          >
            <defs>
              <linearGradient id="logo-gradient" x1="30.01" y1="126.41" x2="30.01" y2="70.83">
                <stop offset=".56" stopColor="#f26822"></stop>
                <stop offset="1" stopColor="#c82027"></stop>
              </linearGradient>
              <linearGradient id="logo-gradient-2" x1="148.33" y1="56.1" x2="148.33" y2=".52">
                <stop offset=".37" stopColor="#197d5f"></stop>
                <stop offset=".77" stopColor="#88c874"></stop>
              </linearGradient>
            </defs>
            <text
              transform="translate(0 48.08)"
              fill="white"
              fontFamily="system-ui"
              fontWeight="bold"
              fontSize="32"
            >
              <tspan fill="url(#logo-gradient)">C</tspan>
              <tspan fill="white">RYP</tspan>
              <tspan fill="url(#logo-gradient-2)">TO</tspan>
            </text>
            <text
              transform="translate(58.29 76.03)"
              fill="white"
              fontFamily="system-ui"
              fontSize="14"
              letterSpacing="2"
            >
              SCREENER
            </text>
          </svg>
        </a>
      </div>

      {/* Exchange Selector */}
      <div style={{ minWidth: '200px' }}>
        <SegmentedControl
          size="xs"
          data={EXCHANGES.map((ex) => ({
            value: ex.id,
            label: (
              <Group gap={4} wrap="nowrap">
                <span style={{ fontSize: '14px' }}>{ex.emoji}</span>
                <span>{ex.name}</span>
              </Group>
            ),
          }))}
          value={exchange}
          onChange={setExchange}
          style={{ backgroundColor: '#2d2d2d' }}
        />
      </div>

      {/* Mode Selector */}
      <div>
        <SegmentedControl
          size="xs"
          data={[
            { value: 'FUTURES', label: 'Фьючерсы' },
            { value: 'SPOT', label: 'Спот' },
          ]}
          value={mode}
          onChange={(value) => setMode(value as Mode)}
          style={{ backgroundColor: '#2d2d2d' }}
        />
      </div>

      {/* Price Range */}
      <div
        style={{
          backgroundColor: '#2d2d2d',
          borderRadius: 5,
          padding: '0 0.5rem',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Select
          size="xs"
          value={priceRange}
          onChange={(value) => value && setPriceRange(value as PriceRange)}
          data={PRICE_RANGES}
          styles={{
            input: {
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
            },
          }}
          rightSection={<IconChartBar size={14} color="#888" />}
        />
        <ActionIcon variant="subtle" size="sm" color="gray">
          <IconSettings size={14} />
        </ActionIcon>
      </div>

      {/* Interval */}
      <div
        style={{
          backgroundColor: '#2d2d2d',
          borderRadius: 5,
          padding: '0 0.5rem',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Select
          size="xs"
          value={interval}
          onChange={(value) => value && setInterval(value as Interval)}
          data={INTERVALS}
          styles={{
            input: {
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
            },
          }}
          rightSection={<IconChartBar size={14} color="#888" />}
        />
        <ActionIcon variant="subtle" size="sm" color="gray">
          <IconSettings size={14} />
        </ActionIcon>
      </div>

      {/* Grid Size */}
      <div
        style={{
          backgroundColor: '#2d2d2d',
          borderRadius: 5,
          padding: '0 0.5rem',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Select
          size="xs"
          value={String(gridSize)}
          onChange={(value) => value && setGridSize(Number(value) as GridSize)}
          data={GRID_SIZES.map(g => ({ value: g.value, label: g.label }))}
          styles={{
            input: {
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
            },
          }}
          rightSection={<IconLayoutGrid size={14} color="#888" />}
        />
        <ActionIcon variant="subtle" size="sm" color="gray">
          <IconSettings size={14} />
        </ActionIcon>
      </div>

      <div style={{ flex: 1 }} />

      {/* Action Icons */}
      <Group gap={4}>
        <ActionIcon variant="subtle" size="lg" color="gray">
          <IconSearch size={20} />
        </ActionIcon>

        <ActionIcon variant="subtle" size="lg" color="gray">
          <Badge
            size="xs"
            circle
            color="green"
            style={{ position: 'absolute', top: 4, right: 4 }}
          />
          <IconBell size={20} />
        </ActionIcon>

        <ActionIcon variant="subtle" size="lg" color="gray">
          <Badge
            size="xs"
            circle
            color="green"
            style={{ position: 'absolute', top: 4, right: 4 }}
          />
          <IconChartBar size={20} />
        </ActionIcon>

        <ActionIcon variant="subtle" size="lg" color="gray">
          <IconTrendingUp size={20} />
        </ActionIcon>

        <ActionIcon variant="subtle" size="lg" color="gray">
          <IconLayoutGrid size={20} />
        </ActionIcon>

        <ActionIcon variant="subtle" size="lg" color="gray" component="a" href="/densities">
          <IconMap size={20} />
        </ActionIcon>

        <ActionIcon variant="subtle" size="lg" color="gray" component="a" href="/marketreview">
          <IconReport size={20} />
        </ActionIcon>

        <ActionIcon variant="subtle" size="lg" color="gray">
          <IconSettings size={20} />
        </ActionIcon>

        <ThemeToggle />

        <ExportCSV tickers={tickers} />

        <ActionIcon variant="subtle" size="lg" color="gray">
          <IconLogout size={20} />
        </ActionIcon>

        {/* User Avatar */}
        <Avatar
          src="https://avatars.yandex.net/get-yapic/0/0-0/islands-200"
          size="md"
          radius="xl"
          style={{ cursor: 'pointer', marginLeft: 8 }}
        />
      </Group>
    </header>
  );
}
