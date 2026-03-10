import { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';

const PAGE_SIZE_OPTIONS = [30, 50, 70, 100];

const Pagination = ({ currentPage, totalItems, pageSize, onPageChange, onPageSizeChange, children }) => {
    const totalPages = Math.ceil(totalItems / pageSize);

    if (totalItems === 0) return children || null;

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            if (currentPage <= 3) {
                end = Math.min(maxVisible, totalPages - 1);
            } else if (currentPage >= totalPages - 2) {
                start = Math.max(totalPages - maxVisible + 1, 2);
            }

            if (start > 2) pages.push('...');
            for (let i = start; i <= end; i++) pages.push(i);
            if (end < totalPages - 1) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    const renderControls = () => (
        <div className="pagination-controls">
            <button
                className="pagination-btn"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                title="First Page"
            >
                <FiChevronsLeft />
            </button>
            <button
                className="pagination-btn"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="Previous Page"
            >
                <FiChevronLeft />
            </button>

            <div className="pagination-pages">
                {getPageNumbers().map((page, idx) =>
                    page === '...' ? (
                        <span key={`ellipsis-${idx}`} className="pagination-ellipsis">…</span>
                    ) : (
                        <button
                            key={page}
                            className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </button>
                    )
                )}
            </div>

            <button
                className="pagination-btn"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                title="Next Page"
            >
                <FiChevronRight />
            </button>
            <button
                className="pagination-btn"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                title="Last Page"
            >
                <FiChevronsRight />
            </button>
        </div>
    );

    const renderBar = (position) => (
        <div className={`pagination-bar pagination-bar-${position}`}>
            <div className="pagination-info">
                Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{totalItems}</strong>
            </div>
            {renderControls()}
            <div className="pagination-size">
                <label>Per page:</label>
                <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
                    {PAGE_SIZE_OPTIONS.map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
            </div>
        </div>
    );

    return (
        <>
            {renderBar('top')}
            {children}
            {renderBar('bottom')}
        </>
    );
};

// Helper hook for pagination state
export const usePagination = (initialPageSize = 30) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handlePageSizeChange = (size) => {
        setPageSize(size);
        setCurrentPage(1);
    };

    const resetPage = () => setCurrentPage(1);

    const paginateData = (data) => {
        const start = (currentPage - 1) * pageSize;
        return data.slice(start, start + pageSize);
    };

    return {
        currentPage,
        pageSize,
        handlePageChange,
        handlePageSizeChange,
        resetPage,
        paginateData
    };
};

export default Pagination;
