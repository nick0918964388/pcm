import { NextRequest, NextResponse } from 'next/server';
import { PhotoSearchService } from '@/lib/services/photo-search-service';
import type {
  SearchOptions,
  AdvancedSearchOptions,
  SearchFilters,
} from '@/lib/services/photo-search-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const requestedLimit = parseInt(searchParams.get('limit') || '20');

    // Validate pagination limits before processing
    if (requestedLimit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const limit = Math.min(100, Math.max(1, requestedLimit));

    // Parse common parameters
    const userId = searchParams.get('userId') || undefined;
    const projectId = searchParams.get('projectId') || undefined;
    const sortBy = searchParams.get('sortBy') || undefined;
    const sortOrder =
      (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined;

    // Check if this is an advanced search
    const isAdvanced = searchParams.get('advanced') === 'true';

    if (isAdvanced) {
      // Handle advanced search
      const filters: SearchFilters = {};

      // Date filters
      const dateFrom = searchParams.get('dateFrom');
      const dateTo = searchParams.get('dateTo');
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      // File type and size filters
      const fileType = searchParams.get('fileType');
      const minSize = searchParams.get('minSize');
      const maxSize = searchParams.get('maxSize');
      if (fileType) filters.fileType = fileType;
      if (minSize) filters.minSize = parseInt(minSize);
      if (maxSize) filters.maxSize = parseInt(maxSize);

      // Tag filters
      const tagsParam = searchParams.get('tags');
      if (tagsParam) {
        filters.tags = tagsParam.split(',').map(tag => tag.trim());
      }

      // Camera filter
      const camera = searchParams.get('camera');
      if (camera) filters.camera = camera;

      // GPS location filter
      const lat = searchParams.get('lat');
      const lng = searchParams.get('lng');
      const radius = searchParams.get('radius');

      if (lat && lng) {
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        const radiusNum = radius ? parseInt(radius) : 1000;

        if (isNaN(latNum) || isNaN(lngNum)) {
          return NextResponse.json(
            { error: 'Invalid GPS coordinates' },
            { status: 400 }
          );
        }

        filters.gpsLocation = {
          lat: latNum,
          lng: lngNum,
          radius: radiusNum,
        };
      }

      const options: AdvancedSearchOptions = {
        filters,
        page,
        limit,
        userId,
        projectId,
        sortBy,
        sortOrder,
      };

      const results = await PhotoSearchService.advancedSearch(options);
      return NextResponse.json(results);
    } else {
      // Handle basic search
      const query = searchParams.get('q') || '';

      const options: SearchOptions = {
        query,
        page,
        limit,
        userId,
        projectId,
        sortBy,
        sortOrder,
      };

      const results = await PhotoSearchService.search(options);
      return NextResponse.json(results);
    }
  } catch (error) {
    console.error('Photo search error:', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
